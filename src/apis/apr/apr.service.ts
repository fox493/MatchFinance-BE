import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import puppeteer, { Browser } from 'puppeteer';
import { RedisClientType } from 'redis';
import { AccountPoints } from '../airdrop/entities/account_points.entity';
import { Repository } from 'typeorm';
import { BigNumberish, ethers } from 'ethers';
import axios from 'axios';
import { ContractService } from 'src/contract/contract.service';

@Injectable()
export class AprService {
  private puppeteerBrowser: Browser;

  constructor(
    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType,
    @InjectRepository(AccountPoints)
    private accountPointsRepository: Repository<AccountPoints>,
    private readonly contractService: ContractService,
  ) {
    this.init();
    this.syncPrice();
  }

  async init() {
    this.puppeteerBrowser = await puppeteer.launch({ headless: 'new' });
    this.fetchApyData();
  }

  async getApyData() {
    const apy = await this.redisClient.get('apy');
    const total_liquidity = await this.redisClient.get('total_liquidity');
    const fees = await this.redisClient.get('fees');
    const weth_apr = await this.redisClient.get('weth_apr');
    // calculate airdrop apr
    const totalPoints = await this.accountPointsRepository.sum('points');
    const eth_airdrop_apr = `${(
      (0.14 * 365 * 600000 * 100) /
      totalPoints
    )?.toFixed(2)}%`;
    const dlp_airdrop_apr = `${(
      (3 * 0.14 * 365 * 600000 * 100) /
      totalPoints
    )?.toFixed(2)}%`;
    const dlpApr = await this.redisClient.get('dlpApr');
    const stethApr = await this.redisClient.get('stethApr');
    const matchApr = await this.redisClient.get('matchApr');
    const meslbrApr = await this.redisClient.get('meslbrApr');
    return {
      apy: apy.split('~')[1],
      total_liquidity,
      fees,
      weth_apr,
      eth_airdrop_apr,
      dlp_airdrop_apr,
      airdropApr: {
        eth: stethApr,
        dlp: dlpApr,
        match: matchApr,
        meslbr: meslbrApr,
      },
    };
  }

  async getAirdropApr() {
    const dlpApr = await this.redisClient.get('dlpApr');
    const stethApr = await this.redisClient.get('stethApr');
    const matchApr = await this.redisClient.get('matchApr');
    const meslbrApr = await this.redisClient.get('meslbrApr');
    return {
      dlp: dlpApr ? Number(dlpApr) : 0,
      steth: stethApr ? Number(stethApr) : 0,
      match: matchApr ? Number(matchApr) : 0,
      meslbr: meslbrApr ? Number(meslbrApr) : 0,
    };
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async fetchApyData() {
    try {
      const page = await this.puppeteerBrowser.newPage();

      await page.goto('https://lybra.finance/');

      await page.waitForSelector('.index_aprSpan__nVgD0');

      await new Promise((resolve) => setTimeout(resolve, 15000));

      Logger.log('[Cron-async-apy] Start sync apy data');
      const apy = await page.evaluate(() => {
        const element = document.querySelector('.index_aprSpan__nVgD0');
        //@ts-ignore
        return element ? element.innerText : null;
      });

      // 2. lybra dashboard
      await page.goto('https://lybra.finance/dashboard');
      await page.waitForSelector('.dashboard_titleItem__NyrD1');
      page.$eval('.dashboard_titleItem__NyrD1', (el) => {
        // @ts-ignore
        el.click();
      });
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const weth_apr = await page.evaluate(() => {
        // const fatherElement = document.querySelector('.vaults_tipmainp__gJ3zU');
        const elements = document.querySelectorAll('.vaults_type__soUdP');
        return elements[5].children[1].children[0].innerHTML || '0.00%';
      });

      // 3. uniswap
      await page.goto(
        'https://v2.info.uniswap.org/pair/0x3a0ef60e803aae8e94f741e7f61c7cbe9501e569',
      );

      await page.waitForSelector('.css-9on69b');

      await new Promise((resolve) => setTimeout(resolve, 15000));

      const uniswap_info = await page.evaluate(() => {
        const elements = document.querySelectorAll('.css-9on69b');
        const contents = [];
        elements.forEach((div) => contents.push(div.innerHTML));
        return contents;
      });

      const total_liquidity = uniswap_info[0];

      const fees = uniswap_info[2] === '-' ? '0' : uniswap_info[2];

      // 写入redis
      await this.redisClient.set(
        'dlp_total_liquidity',
        Number(total_liquidity.replace(/\$|,/g, '')) || 0,
      );

      if (apy && apy !== '0.00%') {
        await this.redisClient.set('apy', apy);
      }

      if (fees) {
        await this.redisClient.set('fees', fees);
      }

      if (weth_apr) {
        await this.redisClient.set('weth_apr', weth_apr);
      }

      if (total_liquidity) {
        await this.redisClient.set('total_liquidity', total_liquidity);
      }
    } catch (error) {
      Logger.error(error, '[Cron-async-apy]');
    } finally {
      // 关闭浏览器
      await this.puppeteerBrowser.close();
      Logger.log('[Cron-async-apy] End sync apy data');
    }
  }

  // 每分钟同步一次价格
  @Cron('0 */1 * * * *')
  async syncPrice() {
    // 1. steth
    const stEthPrice = Number(
      ethers.formatEther(
        await this.contractService.StethMintPoolContract.getFunction(
          'getAssetPrice',
        ).staticCall(),
      ),
    );
    // 2. dlp
    const dlpPrice = ethers.formatEther(
      await this.contractService.MatchFinancePoolContract.getLpValue(
        ethers.parseEther('1'),
      ),
    );
    // 3. match
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=match-token&vs_currencies=usd',
      {
        timeout: 10000,
      },
    );

    const matchPrice = Number(data['match-token'].usd);

    // 4. meslbr
    const ethInPool = await this.contractService.WETHContract.balanceOf(
      '0x3A0eF60e803aae8e94f741E7F61c7CBe9501e569',
    );
    const lbrInPool = await this.contractService.LBRContract.balanceOf(
      '0x3A0eF60e803aae8e94f741E7F61c7CBe9501e569',
    );
    const lbrPriceInE =
      Number(ethers.formatEther(ethInPool)) /
      Number(ethers.formatEther(lbrInPool));

    const lbrPrice = Number(lbrPriceInE) * stEthPrice;

    // steth tvl
    const stethTotal = ethers.formatEther(
      await this.contractService.MatchFinancePoolContract.totalSupplied(
        '0xa980d4c0C2E48d305b582AA439a3575e3de06f0E',
      ),
    );
    const stethTVL = Number(stethTotal) * stEthPrice;

    // dlp tvl
    // const dlpTVL = await this.redisClient.get('dlp_total_liquidity');
    const totalStaked = ethers.formatEther(
      await this.contractService.MatchFinancePoolContract.totalStaked(),
    );
    const dlpTVL = Number(totalStaked) * Number(dlpPrice);

    // match tvl
    const matchTotal = ethers.formatEther(
      await this.contractService.VLMatchStakingPoolContract.totalStaked(),
    );
    const matchTVL = Number(matchTotal) * Number(data['match-token'].usd);

    // lbr tvl
    const lbrTotal = ethers.formatEther(
      await this.contractService.MesLbrStakingPoolContract.totalStaked(),
    );
    const lbrTVL = Number(lbrTotal) * lbrPrice;

    console.log(
      'stethTVL',
      stethTVL,
      'dlpTVL',
      dlpTVL,
      'matchTVL',
      matchTVL,
      'lbrTotal',
      lbrTVL,
    );

    const baseApr =
      (((0.01 * 10000000 * matchPrice) /
        (0.2 * dlpTVL + 0.1 * stethTVL + 0.1 * matchTVL + 0.05 * lbrTVL)) *
        365) /
      42;

    const dlpApr = baseApr * 0.2;
    const stethApr = baseApr * 0.1;
    const matchApr = baseApr * 0.1;
    const meslbrApr = baseApr * 0.05;
    console.log(
      'dlpApr',
      dlpApr,
      'stethApr',
      stethApr,
      'matchApr',
      matchApr,
      'meslbrApr',
      meslbrApr,
    );

    await this.redisClient.set('dlpApr', dlpApr.toFixed(2));
    await this.redisClient.set('stethApr', stethApr.toFixed(2));
    await this.redisClient.set('matchApr', matchApr.toFixed(2));
    await this.redisClient.set('meslbrApr', meslbrApr.toFixed(2));
  }
}
