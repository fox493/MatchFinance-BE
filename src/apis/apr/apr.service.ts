import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import puppeteer, { Browser } from 'puppeteer';
import { RedisClientType } from 'redis';
import { AccountPoints } from '../airdrop/entities/account_points.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AprService {
  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;
  @InjectRepository(AccountPoints)
  private accountPointsRepository: Repository<AccountPoints>;
  private puppeteerBrowser: Browser;
  constructor() {
    this.init();
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
    return {
      apy: apy.split('~')[1],
      total_liquidity,
      fees,
      weth_apr,
      eth_airdrop_apr,
      dlp_airdrop_apr,
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
}
