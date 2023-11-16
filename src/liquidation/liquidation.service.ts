import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { ContractService } from 'src/contract/contract.service';
import { LiquidationInfoEntity } from './entities/liquidation.entity';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LiquidationService {
  constructor(
    private readonly contractService: ContractService,
    @InjectRepository(LiquidationInfoEntity)
    private readonly liquidationInfoRepository: Repository<LiquidationInfoEntity>,
  ) {
    this.syncLiquidationInfo();
  }

  async getLiquidationInfo(address: string) {
    return await this.liquidationInfoRepository.find({
      where: {
        pool: address,
      },
    });
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncLiquidationInfo() {
    try {
      const eUsdBorrowedAccounts = await this.getEusdBorrowedAccounts();
      const mintPoolAddress =
        await this.contractService.MatchFinancePoolContract.getMintPool();
      let liquidationData = [];
      for (const account of eUsdBorrowedAccounts) {
        const data =
          await this.contractService.MatchFinancePoolContract.borrowed(
            mintPoolAddress,
            account.account,
          );
        const newLiquidationData = this.liquidationInfoRepository.create({
          pool: mintPoolAddress,
          user_address: account.account,
          principal: Number(data[0]).toString(),
          interest_amount: Number(data[1]).toString(),
          acc_interest_amount: Number(data[2]).toString(),
          interest_timestamp: Number(data[3]).toString(),
        });
        liquidationData.push(newLiquidationData);
      }
      // 清空原有表
      await this.liquidationInfoRepository.clear();
      // 重新插入数据
      await this.liquidationInfoRepository.save(liquidationData);
      Logger.log('同步清算数据成功', 'LiquidationService');
    } catch (error) {
      Logger.error(error, 'LiquidationService');
    }
  }

  async getEusdBorrowedAccounts() {
    const res = await axios.get(
      `https://api.dune.com/api/v1/query/3203936/results?api_key=${process.env.DUNE_API_KEY}`,
    );

    return res.data.result.rows;
  }
}
