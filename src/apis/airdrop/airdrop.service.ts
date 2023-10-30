import { Injectable, Logger } from '@nestjs/common';
import { ContractService } from 'src/contract/contract.service';
import axios from 'axios';
import { ethers } from 'ethers';
import { AccountPoints } from './entities/account_points.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AirdropService {
  constructor(
    private readonly contractService: ContractService,
    @InjectRepository(AccountPoints)
    private readonly accountPointsRepository: Repository<AccountPoints>,
  ) {
    this.syncAccountPoints();
  }

  async getAccountPoints() {
    // 根据points排序
    const res = await this.accountPointsRepository.find({
      order: {
        points: 'DESC',
      },
    });
    return res;
  }

  @Cron(CronExpression.EVERY_8_HOURS)
  async syncAccountPoints() {
    Logger.log('[Cron-async-points] Start sync account points');
    const airdrop_start_time =
      new Date(process.env.AIRDROP_START_TIME).getTime() / 1000;
    try {
      const stEthPrice = Number(
        ethers.formatEther(
          await this.contractService.StethMintPoolContract.getFunction(
            'getAssetPrice',
          ).staticCall(),
        ),
      );
      const lpPrice = Number(
        ethers.formatEther(
          await this.contractService.MatchFinancePoolContract.getLpValue(
            ethers.parseEther('1'),
          ),
        ),
      );
      const stETHSuppliedData = await this.getStEthTotalSuppliedTableFromDune();
      const stETHWithdrewData = await this.getStEthWithdrewTableFromDune();
      const lpStakedData = await this.getLpStakedTableFromDune();
      const lpWithdrewData = await this.getLpWithdrewTableFromDune();
      const accounts: AccountPoints[] = [];
      // 1.遍历withdrew表，标记用户是否在空投后提取过资金，这将直接决定分数是否受时间因子影响
      for (let data of lpWithdrewData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        if (timestamp > airdrop_start_time) {
          const address = data['account'];
          const account = accounts.find(
            (account) => account.address === address,
          );
          if (account) {
            account.withdrew_after_airdrp_start = true;
          } else {
            const newAccount = new AccountPoints();
            newAccount.address = address;
            newAccount.withdrew_after_airdrp_start = true;
            accounts.push(newAccount);
          }
        }
      }
      for (let data of stETHWithdrewData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        if (timestamp > airdrop_start_time) {
          const address = data['account'];
          const account = accounts.find(
            (account) => account.address === address,
          );
          if (account) {
            account.withdrew_after_airdrp_start = true;
          } else {
            const newAccount = new AccountPoints();
            newAccount.address = address;
            newAccount.withdrew_after_airdrp_start = true;
            accounts.push(newAccount);
          }
        }
      }
      // 2. 遍历withdrew的两个表，记录用户总的withdrew金额，同时为用户扣除withdrew分
      // 这里分为两种情况：
      //  1） 如果用户在空投活动开始后提取过资金，那么用户每笔提款将扣除金额等额的分数
      //  2） 如果用户在空投后动开始后没有提取过资金，那么用户每笔提款将扣除金额 * 时间因子的分数
      for (let data of lpWithdrewData) {
        const address = data['account'];
        const withdrew = lpPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;
        const timeFactor = this.getTimeFactor(now - airdrop_start_time);
        if (account) {
          account.lp_withdrew = account.lp_withdrew
            ? account.lp_withdrew + withdrew
            : withdrew;
          if (account.withdrew_after_airdrp_start) {
            account.points = account.points
              ? account.points - withdrew
              : -withdrew;
          } else {
            const points = withdrew * timeFactor;
            account.points = account.points ? account.points - points : -points;
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.lp_withdrew = withdrew;
          newAccount.points = -withdrew * timeFactor;
          accounts.push(newAccount);
        }
      }
      for (let data of stETHWithdrewData) {
        const address = data['account'];
        const withdrew =
          stEthPrice * Number(ethers.formatEther(data['amount']));
        const now = new Date().getTime() / 1000;
        const timeFactor = this.getTimeFactor(now - airdrop_start_time);
        const account = accounts.find((account) => account.address === address);
        if (account) {
          account.steth_withdrew = account.steth_withdrew
            ? account.steth_withdrew + withdrew
            : withdrew;
          if (account.withdrew_after_airdrp_start) {
            account.points = account.points
              ? account.points - withdrew
              : -withdrew;
          } else {
            const points = withdrew * timeFactor;
            account.points = account.points ? account.points - points : -points;
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.steth_withdrew = withdrew;
          newAccount.points = -withdrew * timeFactor;
          accounts.push(newAccount);
        }
      }
      // 3. 遍历supplied表，记录用户supplied金额，用户总分加supplied金额 * 时间因子（如果有withdrew标签，时间因子为1）
      for (let data of stETHSuppliedData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const address = data['account'];
        const supplied =
          stEthPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;

        if (account) {
          account.steth_supplied = account.steth_supplied
            ? account.steth_supplied + supplied
            : supplied;

          if (account.withdrew_after_airdrp_start) {
            account.points = account.points
              ? account.points + supplied
              : supplied;
          } else {
            // 判断存款发生在空投开始前后
            if (timestamp > airdrop_start_time) {
              const timeFactor = this.getTimeFactor(now - timestamp);
              const points = supplied * timeFactor;
              account.points = account.points
                ? account.points + points
                : points;
            } else {
              const timeFactor = this.getTimeFactor(now - airdrop_start_time);
              const points = supplied * timeFactor;
              account.points = account.points
                ? account.points + points
                : points;
            }
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.steth_supplied = supplied;
          // 用户不存在，说明之前没有提款记录，直接判断该笔存款的时间
          if (timestamp > airdrop_start_time) {
            const timeFactor = this.getTimeFactor(now - timestamp);
            const points = supplied * timeFactor;
            newAccount.points = points;
          } else {
            const timeFactor = this.getTimeFactor(now - airdrop_start_time);
            const points = supplied * timeFactor;
            newAccount.points = points;
          }
          accounts.push(newAccount);
        }
      }
      // 4. 遍历staked表，记录用户staked金额，用户总分加staked金额 * 时间因子（如果有withdrew标签，时间因子为1）
      for (let data of lpStakedData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const address = data['account'];
        const staked = lpPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;

        if (account) {
          account.lp_staked = account.lp_staked
            ? account.lp_staked + staked
            : staked;

          if (account.withdrew_after_airdrp_start) {
            account.points = account.points ? account.points + staked : staked;
          } else {
            // 判断存款发生在空投开始前后
            if (timestamp > airdrop_start_time) {
              const timeFactor = this.getTimeFactor(now - timestamp);
              const points = staked * timeFactor;
              account.points = account.points
                ? account.points + points
                : points;
            } else {
              const timeFactor = this.getTimeFactor(now - airdrop_start_time);
              const points = staked * timeFactor;
              account.points = account.points
                ? account.points + points
                : points;
            }
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.lp_staked = staked;
          // 用户不存在，说明之前没有提款记录，直接判断该笔存款的时间
          if (timestamp > airdrop_start_time) {
            const timeFactor = this.getTimeFactor(now - timestamp);
            const points = staked * timeFactor;
            newAccount.points = points;
          } else {
            const timeFactor = this.getTimeFactor(now - airdrop_start_time);
            const points = staked * timeFactor;
            newAccount.points = points;
          }
          accounts.push(newAccount);
        }
      }
      // 5. 遍历用户数组，计算每个用户总仓位，为每个用户总分乘以仓位因子
      for (let account of accounts) {
        account.tvl =
          account.steth_supplied ||
          0 + account.lp_staked ||
          0 - account.steth_withdrew ||
          0 - account.lp_withdrew ||
          0;
        const tvlFactor = this.getTVLFactor(account.tvl);
        account.points = account.points * tvlFactor * 0.1;
      }
      // 6. 保存用户数据
      this.accountPointsRepository.save(accounts);
    } catch (error) {
      Logger.error('sync account points failed', error);
    } finally {
      Logger.log('[Cron-async-points] End sync account points');
    }
  }

  async getStEthTotalSuppliedTableFromDune() {
    const res = await axios.get(
      `https://api.dune.com/api/v1/query/3142243/results?api_key=${process.env.DUNE_API_KEY}`,
    );

    return res.data.result.rows;
  }

  async getLpStakedTableFromDune() {
    const res = await axios.get(
      `https://api.dune.com/api/v1/query/3142572/results?api_key=${process.env.DUNE_API_KEY}`,
    );

    return res.data.result.rows;
  }

  async getStEthWithdrewTableFromDune() {
    const res = await axios.get(
      `https://api.dune.com/api/v1/query/3146847/results?api_key=${process.env.DUNE_API_KEY}`,
    );

    return res.data.result.rows;
  }

  async getLpWithdrewTableFromDune() {
    const res = await axios.get(
      `https://api.dune.com/api/v1/query/3146842/results?api_key=${process.env.DUNE_API_KEY}`,
    );

    return res.data.result.rows;
  }

  // 获取时间因子，传入秒数
  getTimeFactor(time: number) {
    const day = 24 * 60 * 60;
    if (time >= 15 * day) {
      return 1.1;
    } else if (time >= 30 * day) {
      return 1.2;
    } else {
      return 1;
    }
  }

  getTVLFactor(tvl: number) {
    if (tvl >= 10000) {
      return 1.1;
    } else if (tvl >= 50000) {
      return 1.2;
    } else if (tvl >= 200000) {
      return 1.4;
    } else {
      return 1;
    }
  }
}
