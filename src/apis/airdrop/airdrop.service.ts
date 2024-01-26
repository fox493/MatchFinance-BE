import { Inject, Injectable, Logger } from '@nestjs/common';
import { ContractService } from 'src/contract/contract.service';
import axios from 'axios';
import { ethers } from 'ethers';
import { AccountPoints } from './entities/account_points.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReferralEntity } from '../referral/entitites/referral.entity';
import { RedisClientType } from 'redis';
import { AccountPointsV2 } from './entities/account_points_v2.entity';

@Injectable()
export class AirdropService {
  constructor(
    private readonly contractService: ContractService,
    @InjectRepository(AccountPoints)
    private readonly accountPointsRepository: Repository<AccountPoints>,
    @InjectRepository(AccountPointsV2)
    private readonly accountPointsRepositoryV2: Repository<AccountPointsV2>,
    @InjectRepository(ReferralEntity)
    private readonly referralRepository: Repository<ReferralEntity>,
    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType,
  ) {
    // this.syncAccountPoints();
    this.syncAccountPointsV2();
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

  async getAccountPointsV2() {
    // 根据points排序
    const res = await this.accountPointsRepositoryV2.find({
      order: {
        points: 'DESC',
      },
    });
    return res;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAccountPointsV2() {
    Logger.log('[Cron-async-points] Start sync account points V2');
    const airdrop_start_time =
      new Date(process.env.AIRDROP_V2_START_TIME).getTime() / 1000;
    const airdrop_end_time =
      new Date(process.env.AIRDROP_V2_END_TIME).getTime() / 1000;

    const dlpWeight = 2;
    const stethWeight = 1;
    const mesLbrWeight = 0.5;
    const vlMatchWeight = 1;

    const referralBoost = 1.03;

    const referralList = await this.referralRepository.find();

    try {
      const stEthPrice = Number(
        ethers.formatEther(
          await this.contractService.StethMintPoolContract.getFunction(
            'getAssetPrice',
          ).staticCall(),
        ),
      );
      const lpTotalSupply = Number(
        ethers.formatEther(
          await this.contractService.LiquidityPoolContract.totalSupply(),
        ),
      );
      const lpTotalLiquidity = await this.redisClient.get(
        'dlp_total_liquidity',
      );

      let lpPrice = Number(lpTotalLiquidity) / lpTotalSupply;
      if (!lpPrice) {
        lpPrice = Number(
          ethers.formatEther(
            await this.contractService.MatchFinancePoolContract.getLpValue(
              ethers.parseEther('1'),
            ),
          ),
        );
      }
      const stETHSuppliedData = await this.getStEthTotalSuppliedTableFromDune();
      const stETHWithdrewData = await this.getStEthWithdrewTableFromDune();
      const lpStakedData = await this.getLpStakedTableFromDune();
      const lpWithdrewData = await this.getLpWithdrewTableFromDune();
      const accounts: AccountPointsV2[] = [];
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
            const newAccount = new AccountPointsV2();
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
            const newAccount = new AccountPointsV2();
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
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;
        const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getTimePassedFactor(timestamp);
        if (account) {
          account.lp_withdrew = account.lp_withdrew
            ? account.lp_withdrew + withdrew
            : withdrew;
          if (account.withdrew_after_airdrp_start) {
            const points = withdrew * timePassedFactor * dlpWeight;
            account.points = account.points ? account.points - points : -points;
          } else {
            const points = withdrew * timeFactor * timePassedFactor * dlpWeight;
            account.points = account.points ? account.points - points : -points;
          }
        } else {
          const newAccount = new AccountPointsV2();
          newAccount.address = address;
          newAccount.lp_withdrew = withdrew;
          newAccount.points =
            -withdrew * timeFactor * timePassedFactor * dlpWeight;
          accounts.push(newAccount);
        }
      }
      for (let data of stETHWithdrewData) {
        const address = data['account'];
        const withdrew =
          stEthPrice * Number(ethers.formatEther(data['amount']));
        const now = new Date().getTime() / 1000;
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;
        const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getTimePassedFactor(timestamp);
        const account = accounts.find((account) => account.address === address);
        if (account) {
          account.steth_withdrew = account.steth_withdrew
            ? account.steth_withdrew + withdrew
            : withdrew;
          if (account.withdrew_after_airdrp_start) {
            const points = withdrew * timePassedFactor * stethWeight;
            account.points = account.points ? account.points - points : -points;
          } else {
            const points =
              withdrew * timeFactor * timePassedFactor * stethWeight;
            account.points = account.points ? account.points - points : -points;
          }
        } else {
          const newAccount = new AccountPointsV2();
          newAccount.address = address;
          newAccount.steth_withdrew = withdrew;
          newAccount.points =
            -withdrew * timeFactor * timePassedFactor * stethWeight;
          accounts.push(newAccount);
        }
      }
      // 3. 遍历supplied表，记录用户supplied金额，用户总分加supplied金额 * 时间因子（如果有withdrew标签，时间因子为1）
      for (let data of stETHSuppliedData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getTimePassedFactor(timestamp);
        const address = data['account'];
        const supplied =
          stEthPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;

        if (account) {
          account.steth_supplied = account.steth_supplied
            ? account.steth_supplied + supplied
            : supplied;

          if (account.withdrew_after_airdrp_start) {
            const points = supplied * timePassedFactor * stethWeight;
            account.points = account.points ? account.points + points : points;
          } else {
            // 判断存款发生在空投开始前后
            if (timestamp > airdrop_start_time) {
              const timeFactor = this.getTimeFactor(endTime - timestamp);
              const points =
                supplied * timeFactor * timePassedFactor * stethWeight;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            } else {
              const timeFactor = this.getTimeFactor(
                endTime - airdrop_start_time,
              );
              const points =
                supplied * timeFactor * timePassedFactor * stethWeight;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            }
          }
        } else {
          const newAccount = new AccountPointsV2();
          newAccount.address = address;
          newAccount.steth_supplied = supplied;
          // 用户不存在，说明之前没有提款记录，直接判断该笔存款的时间
          if (timestamp > airdrop_start_time) {
            const timeFactor = this.getTimeFactor(endTime - timestamp);
            const points =
              supplied * timeFactor * timePassedFactor * stethWeight;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          } else {
            const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
            const points =
              supplied * timeFactor * timePassedFactor * stethWeight;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          }
          accounts.push(newAccount);
        }
      }
      // 4. 遍历staked表，记录用户staked金额，用户总分加staked金额 * 时间因子（如果有withdrew标签，时间因子为1）
      for (let data of lpStakedData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getTimePassedFactor(timestamp);
        const address = data['account'];
        const staked = lpPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;
        if (account) {
          account.lp_staked = account.lp_staked
            ? account.lp_staked + staked
            : staked;

          if (account.withdrew_after_airdrp_start) {
            const points = staked * timePassedFactor * dlpWeight;
            account.points = account.points ? account.points + points : points;
          } else {
            // 判断存款发生在空投开始前后
            if (timestamp > airdrop_start_time) {
              const timeFactor = this.getTimeFactor(endTime - timestamp);
              // dlp计分规则：空投开始后到DLP bonus开始前，每天获得仓位等额分数，
              // DLP bonus开始后，每天获得仓位3倍分数
              const points = staked * timeFactor * timePassedFactor * dlpWeight;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            } else {
              const timeFactor = this.getTimeFactor(
                endTime - airdrop_start_time,
              );
              const points = staked * timeFactor * timePassedFactor * dlpWeight;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            }
          }
        } else {
          const newAccount = new AccountPointsV2();
          newAccount.address = address;
          newAccount.lp_staked = staked;
          // 用户不存在，说明之前没有提款记录，直接判断该笔存款的时间
          if (timestamp > airdrop_start_time) {
            const timeFactor = this.getTimeFactor(endTime - timestamp);
            const points = staked * timeFactor * timePassedFactor * dlpWeight;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          } else {
            const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
            const points = staked * timeFactor * timePassedFactor * dlpWeight;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          }
          accounts.push(newAccount);
        }
      }
      // 5. 遍历用户数组，计算每个用户总仓位，为每个用户总分乘以仓位因子
      for (let account of accounts) {
        account.tvl =
          (account.steth_supplied || 0) +
          (account.lp_staked || 0) -
          (account.lp_withdrew || 0) -
          (account.steth_withdrew || 0);
        const tvlFactor = this.getTVLFactor(account.tvl);

        // 如果用户有被邀请记录，就代表用户填写过邀请码，那么用户将获得邀请boost
        const isReferred = referralList.find(
          (referral) => referral.referred_address === account.address,
        );
        account.base_points = account.points * tvlFactor * 0.1;
        if (isReferred) {
          account.points = account.points * tvlFactor * 0.1 * referralBoost;
        } else {
          account.points = account.points * tvlFactor * 0.1;
        }

        account.tvl_factor = tvlFactor;
      }
      // 6. 统计用户邀请得分
      this.getReferralBonustPoints(referralList, accounts);
      // 7. 先清空再保存用户数据
      await this.accountPointsRepositoryV2.clear();
      await this.accountPointsRepositoryV2.save(accounts);
    } catch (error) {
      Logger.error('sync account points failed', error);
      console.log(error);
    } finally {
      Logger.log('[Cron-async-points] End sync account points V2');
    }
  }

  // @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAccountPoints() {
    Logger.log('[Cron-async-points] Start sync account points');
    const airdrop_start_time =
      new Date(process.env.AIRDROP_START_TIME).getTime() / 1000;
    const airdrop_end_time =
      new Date(process.env.AIRDROP_END_TIME).getTime() / 1000;
    try {
      const stEthPrice = Number(
        ethers.formatEther(
          await this.contractService.StethMintPoolContract.getFunction(
            'getAssetPrice',
          ).staticCall(),
        ),
      );
      const lpTotalSupply = Number(
        ethers.formatEther(
          await this.contractService.LiquidityPoolContract.totalSupply(),
        ),
      );
      const lpTotalLiquidity = await this.redisClient.get(
        'dlp_total_liquidity',
      );

      let lpPrice = Number(lpTotalLiquidity) / lpTotalSupply;
      if (!lpPrice) {
        lpPrice = Number(
          ethers.formatEther(
            await this.contractService.MatchFinancePoolContract.getLpValue(
              ethers.parseEther('1'),
            ),
          ),
        );
      }
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
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;
        const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getDLPBounsFactor(timestamp);
        if (account) {
          account.lp_withdrew = account.lp_withdrew
            ? account.lp_withdrew + withdrew
            : withdrew;
          if (account.withdrew_after_airdrp_start) {
            const points = withdrew * timePassedFactor;
            account.points = account.points ? account.points - points : -points;
          } else {
            const points = withdrew * timeFactor * timePassedFactor;
            account.points = account.points ? account.points - points : -points;
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.lp_withdrew = withdrew;
          newAccount.points = -withdrew * timeFactor * timePassedFactor;
          accounts.push(newAccount);
        }
      }
      for (let data of stETHWithdrewData) {
        const address = data['account'];
        const withdrew =
          stEthPrice * Number(ethers.formatEther(data['amount']));
        const now = new Date().getTime() / 1000;
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;
        const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getTimePassedFactor(timestamp);
        const account = accounts.find((account) => account.address === address);
        if (account) {
          account.steth_withdrew = account.steth_withdrew
            ? account.steth_withdrew + withdrew
            : withdrew;
          if (account.withdrew_after_airdrp_start) {
            const points = withdrew * timePassedFactor;
            account.points = account.points ? account.points - points : -points;
          } else {
            const points = withdrew * timeFactor * timePassedFactor;
            account.points = account.points ? account.points - points : -points;
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.steth_withdrew = withdrew;
          newAccount.points = -withdrew * timeFactor * timePassedFactor;
          accounts.push(newAccount);
        }
      }
      // 3. 遍历supplied表，记录用户supplied金额，用户总分加supplied金额 * 时间因子（如果有withdrew标签，时间因子为1）
      for (let data of stETHSuppliedData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getTimePassedFactor(timestamp);
        const address = data['account'];
        const supplied =
          stEthPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;

        if (account) {
          account.steth_supplied = account.steth_supplied
            ? account.steth_supplied + supplied
            : supplied;

          if (account.withdrew_after_airdrp_start) {
            const points = supplied * timePassedFactor;
            account.points = account.points ? account.points + points : points;
          } else {
            // 判断存款发生在空投开始前后
            if (timestamp > airdrop_start_time) {
              const timeFactor = this.getTimeFactor(endTime - timestamp);
              const points = supplied * timeFactor * timePassedFactor;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            } else {
              const timeFactor = this.getTimeFactor(
                endTime - airdrop_start_time,
              );
              const points = supplied * timeFactor * timePassedFactor;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            }
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.steth_supplied = supplied;
          // 用户不存在，说明之前没有提款记录，直接判断该笔存款的时间
          if (timestamp > airdrop_start_time) {
            const timeFactor = this.getTimeFactor(endTime - timestamp);
            const points = supplied * timeFactor * timePassedFactor;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          } else {
            const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
            const points = supplied * timeFactor * timePassedFactor;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          }
          accounts.push(newAccount);
        }
      }
      // 4. 遍历staked表，记录用户staked金额，用户总分加staked金额 * 时间因子（如果有withdrew标签，时间因子为1）
      for (let data of lpStakedData) {
        const timestamp = new Date(data['evt_block_time']).getTime() / 1000;
        const timePassedFactor = this.getDLPBounsFactor(timestamp);
        const address = data['account'];
        const staked = lpPrice * Number(ethers.formatEther(data['amount']));
        const account = accounts.find((account) => account.address === address);
        const now = new Date().getTime() / 1000;
        const endTime = airdrop_end_time > now ? now : airdrop_end_time;
        if (account) {
          account.lp_staked = account.lp_staked
            ? account.lp_staked + staked
            : staked;

          if (account.withdrew_after_airdrp_start) {
            const points = staked * timePassedFactor;
            account.points = account.points ? account.points + points : points;
          } else {
            // 判断存款发生在空投开始前后
            if (timestamp > airdrop_start_time) {
              const timeFactor = this.getTimeFactor(endTime - timestamp);
              // dlp计分规则：空投开始后到DLP bonus开始前，每天获得仓位等额分数，
              // DLP bonus开始后，每天获得仓位3倍分数
              const points = staked * timeFactor * timePassedFactor;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            } else {
              const timeFactor = this.getTimeFactor(
                endTime - airdrop_start_time,
              );
              const points = staked * timeFactor * timePassedFactor;
              account.points = account.points
                ? account.points + points
                : points;
              account.time_factor = timeFactor;
            }
          }
        } else {
          const newAccount = new AccountPoints();
          newAccount.address = address;
          newAccount.lp_staked = staked;
          // 用户不存在，说明之前没有提款记录，直接判断该笔存款的时间
          if (timestamp > airdrop_start_time) {
            const timeFactor = this.getTimeFactor(endTime - timestamp);
            const points = staked * timeFactor * timePassedFactor;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          } else {
            const timeFactor = this.getTimeFactor(endTime - airdrop_start_time);
            const points = staked * timeFactor * timePassedFactor;
            newAccount.points = points;
            newAccount.time_factor = timeFactor;
          }
          accounts.push(newAccount);
        }
      }
      // 5. 遍历用户数组，计算每个用户总仓位，为每个用户总分乘以仓位因子
      for (let account of accounts) {
        account.tvl =
          (account.steth_supplied || 0) +
          (account.lp_staked || 0) -
          (account.lp_withdrew || 0) -
          (account.steth_withdrew || 0);
        const tvlFactor = this.getTVLFactor(account.tvl);
        account.points = account.points * tvlFactor * 0.1;
        account.tvl_factor = tvlFactor;
      }
      // 6. 统计用户邀请得分
      const referralList = await this.referralRepository.find();
      referralList.forEach((referral) => {
        const referrer = accounts.find(
          (account) =>
            account.address === referral.referer_address.toLowerCase(),
        );
        const referred = accounts.find(
          (account) =>
            account.address === referral.referred_address.toLowerCase(),
        );
        if (!referrer || !referred) return;
        referrer.points = referrer.points
          ? referrer.points + referred.points * 0.1
          : referred.points * 0.1;
        referrer.referral_points = referrer.referral_points
          ? referrer.referral_points + referred.points * 0.1
          : referred.points * 0.1;
      });
      // 7. 计算用户rank得分
      accounts.sort((a, b) => b.points - a.points);
      accounts.forEach((account, index) => {
        account.rank_factor = this.getRankFactor(index);
        account.points = account.points * account.rank_factor;
      });
      // 8. 先清空再保存用户数据
      await this.accountPointsRepository.clear();
      await this.accountPointsRepository.save(accounts);
    } catch (error) {
      Logger.error('sync account points failed', error);
      console.log(error);
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

  async getRecordsAfterAirdropStart(data: any) {
    let res = [];
    const airdrop_start_time =
      new Date(process.env.AIRDROP_V2_START_TIME).getTime() / 1000;
    for (let item of data) {
      const timestamp = new Date(item['evt_block_time']).getTime() / 1000;
      if (timestamp > airdrop_start_time) {
        res.push(item);
      }
    }
    return res;
  }

  // 获取时间因子，传入秒数
  getTimeFactor(time: number) {
    const day = 24 * 60 * 60;
    if (time >= 15 * day && time < 30 * day) {
      return 1.1;
    } else if (time >= 30 * day) {
      return 1.2;
    } else {
      return 1;
    }
  }

  getTVLFactor(tvl: number) {
    if (tvl >= 5000 && tvl < 10000) {
      return 1.3;
    } else if (tvl >= 10000 && tvl < 50000) {
      return 1.5;
    } else if (tvl >= 50000 && tvl < 100000) {
      return 1.6;
    } else if (tvl >= 100000) {
      return 1.7;
    } else {
      return 1;
    }
  }

  getRankFactor(rank: number) {
    if (rank <= 4) {
      return 1.3;
    } else if (rank > 4 && rank <= 9) {
      return 1.2;
    } else if (rank > 9 && rank <= 19) {
      return 1.1;
    } else {
      return 1;
    }
  }

  getTimePassedFactor(timestamp: number) {
    const airdrop_start_time =
      new Date(process.env.AIRDROP_V2_START_TIME).getTime() / 1000;
    const airdrop_end_time =
      new Date(process.env.AIRDROP_V2_END_TIME).getTime() / 1000;
    const now = new Date().getTime() / 1000;
    const end_time = airdrop_end_time > now ? now : airdrop_end_time;
    if (timestamp > airdrop_start_time) {
      const timepassed = end_time - timestamp;
      const daypassed = timepassed / (24 * 60 * 60);
      return daypassed;
    } else {
      const timepassed = end_time - airdrop_start_time;
      const daypassed = timepassed / (24 * 60 * 60);
      return daypassed;
    }
  }

  // only for airdrop v1
  getDLPBounsFactor(timestamp: number) {
    const airdrop_start_time =
      new Date(process.env.AIRDROP_START_TIME).getTime() / 1000;
    const dlp_start_time =
      new Date(process.env.DLP_BONUS_START_TIME).getTime() / 1000;
    const now = new Date().getTime() / 1000;
    const airdrop_end_time =
      new Date(process.env.AIRDROP_END_TIME).getTime() / 1000;
    const end_time = airdrop_end_time > now ? now : airdrop_end_time;

    if (timestamp > airdrop_start_time && timestamp < dlp_start_time) {
      const timepassed = dlp_start_time - timestamp;
      const daypassed = timepassed / (24 * 60 * 60);
      const bonustimepassed = end_time - dlp_start_time;
      const bonusdaypassed = bonustimepassed / (24 * 60 * 60);
      return daypassed + bonusdaypassed * 3;
    } else if (timestamp > dlp_start_time) {
      const timepassed = end_time - timestamp;
      const daypassed = timepassed / (24 * 60 * 60);
      return daypassed * 3;
    } else if (timestamp < airdrop_start_time) {
      const timepassed = dlp_start_time - airdrop_start_time;
      const daypassed = timepassed / (24 * 60 * 60);
      const bonustimepassed = end_time - dlp_start_time;
      const bonusdaypassed = bonustimepassed / (24 * 60 * 60);
      return daypassed + bonusdaypassed * 3;
    }
  }

  // for airdrop v2
  // 三层邀请关系
  // 用户获得直接邀请用户的base_points的10%，同时获得间接邀请用户的base_points的5%
  getReferralBonustPoints(
    referralList: ReferralEntity[],
    accounstList: AccountPointsV2[],
  ) {
    accounstList.forEach((currentAccount) => {
      // 1. 找到用户的直接邀请用户
      const directReferrals = referralList.filter(
        (referral) => referral.referer_address === currentAccount.address,
      );
      // 2. 找到用户的间接邀请用户
      let indirectReferrals: ReferralEntity[] = [];
      directReferrals.forEach((referral) => {
        const indirectReferral = referralList.filter(
          (ref) => ref.referer_address === referral.referred_address,
        );
        indirectReferrals = [...indirectReferrals, ...indirectReferral];
      });
      // 3. 计算用户的直接邀请得分
      directReferrals.forEach((referral) => {
        const account = accounstList.find(
          (account) => account.address === referral.referred_address,
        );
        if (account) {
          currentAccount.referral_points = currentAccount.referral_points
            ? currentAccount.referral_points + account.base_points * 0.1
            : account.base_points * 0.1;
          currentAccount.points += account.base_points * 0.1;
        }
      });
      // 4. 计算用户的间接邀请得分
      indirectReferrals.forEach((referral) => {
        const account = accounstList.find(
          (account) => account.address === referral.referred_address,
        );
        if (account) {
          currentAccount.referral_points = currentAccount.referral_points
            ? currentAccount.referral_points + account.base_points * 0.05
            : account.base_points * 0.05;
          currentAccount.points += account.base_points * 0.05;
        }
      });
    });
    return accounstList;
  }

  async getReferralBonusInfo(address: string) {
    const referralList = await this.referralRepository.find();

    const accountsList = await this.accountPointsRepositoryV2.find();

    const directReferrals = referralList.filter(
      (referral) => referral.referer_address === address,
    );
    let indirectReferrals: ReferralEntity[] = [];

    directReferrals.forEach((referral) => {
      const indirectReferral = referralList.filter(
        (ref) => ref.referer_address === referral.referred_address,
      );
      indirectReferrals = [...indirectReferrals, ...indirectReferral];
    });

    let res = [];

    directReferrals.forEach((ref) => {
      const account = accountsList.find(
        (account) => account.address === ref.referred_address,
      );
      if (account) {
        res.push({
          address: account.address,
          tier: 0.1,
          bonus: account.base_points * 0.1,
        });
      }
    });

    indirectReferrals.forEach((ref) => {
      const account = accountsList.find(
        (account) => account.address === ref.referred_address,
      );
      if (account) {
        res.push({
          address: account.address,
          tier: 0.05,
          bonus: account.base_points * 0.05,
        });
      }
    });

    return res;
  }
}
