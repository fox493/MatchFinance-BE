import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import * as LybraMiningIncentiveABI from 'src/assets/abis/lybra_mining_incentive.json';
import * as LybraStakingRewardABI from 'src/assets/abis/lybra_staking_reward.json';
import * as MatchFinancePoolABI from 'src/assets/abis/match_finance_pool.json';
import * as StethMintPoolABI from 'src/assets/abis/steth_mint_pool.json';

@Injectable()
export class ContractService {
  public readonly LybraMiningIncentiveContract: ethers.Contract;
  public readonly LybraStakingRewardContract: ethers.Contract;
  public readonly MatchFinancePoolContract: ethers.Contract;
  public readonly StethMintPoolContract: ethers.Contract;

  constructor() {
    const provider = new ethers.AlchemyProvider(
      'mainnet',
      process.env.ALCHEMY_KEY,
    );
    this.LybraMiningIncentiveContract = new ethers.Contract(
      process.env.LYBRA_MINING_INCENTIVE_CONTRACT,
      LybraMiningIncentiveABI,
      provider,
    );
    this.LybraStakingRewardContract = new ethers.Contract(
      process.env.LYBRA_STAKING_REWARD_CONTRACT,
      LybraStakingRewardABI,
      provider,
    );
    this.MatchFinancePoolContract = new ethers.Contract(
      process.env.MATCH_FINANCE_POOL_CONTRACT,
      MatchFinancePoolABI,
      provider,
    );
    this.StethMintPoolContract = new ethers.Contract(
      process.env.STETH_MINT_POOL_CONTRACT,
      StethMintPoolABI,
      provider,
    );
  }
}
