import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import puppeteer from 'puppeteer';

@Injectable()
export class AprService {
  private apyData: {
    apy: string;
    total_liquidity: string;
    fees: string;
  };

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
    };

    // 关闭浏览器
    await browser.close();
    Logger.log('[Cron-async-apy] End sync apy data');
  }
}
