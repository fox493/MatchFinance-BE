import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import puppeteer from 'puppeteer';
import { RedisClientType } from 'redis';

@Injectable()
export class AprService {
  private apyData: {
    apy: string;
    total_liquidity: string;
    fees: string;
    weth_apr: string;
  };
  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;
  constructor() {
    this.fetchApyData();
  }
  async getApyData() {
    return this.apyData;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async fetchApyData() {
    const browser = await puppeteer.launch({ headless: 'new' });

    const page = await browser.newPage();

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
      const fatherElement = document.querySelector('.vaults_tipmainp__gJ3zU');
      return fatherElement.children[3].children[0].innerHTML || '0.00%';
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

    const fees = uniswap_info[2];

    this.apyData = {
      apy: apy.split('~')[1],
      total_liquidity,
      fees,
      weth_apr,
    };

    // 写入redis
    await this.redisClient.set(
      'dlp_total_liquidity',
      Number(total_liquidity.replace(/\$|,/g, '')) || 0,
    );

    // 关闭浏览器
    await browser.close();
    Logger.log('[Cron-async-apy] End sync apy data');
  }
}
