import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import * as LybraMiningIncentiveABI from 'src/assets/abis/lybra_mining_incentive.json';
import * as LybraStakingRewardABI from 'src/assets/abis/lybra_staking_reward.json';
import * as MatchFinancePoolABI from 'src/assets/abis/match_finance_pool.json';
import * as StethMintPoolABI from 'src/assets/abis/steth_mint_pool.json';
import * as LiquidityPoolABI from 'src/assets/abis/liquidity_pool.json';
import * as VLMatchStakingPoolABI from 'src/assets/abis/vlmatch_staking_pool.json';
import * as MesLbrStakingPoolABI from 'src/assets/abis/meslbr_staking_pool.json';
import * as TokenABI from 'src/assets/abis/token.json';
@Injectable()
export class ContractService {
  public readonly LybraMiningIncentiveContract: ethers.Contract;
  public readonly LybraStakingRewardContract: ethers.Contract;
  public readonly MatchFinancePoolContract: ethers.Contract;
  public readonly StethMintPoolContract: ethers.Contract;
  public readonly LiquidityPoolContract: ethers.Contract;
  public readonly VLMatchStakingPoolContract: ethers.Contract;
  public readonly MesLbrStakingPoolContract: ethers.Contract;
  public readonly WETHContract: ethers.Contract;
  public readonly LBRContract: ethers.Contract;

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
    this.LiquidityPoolContract = new ethers.Contract(
      process.env.LIQUIDITY_POOL_CONTRACT,
      LiquidityPoolABI,
      provider,
    );
    this.VLMatchStakingPoolContract = new ethers.Contract(
      process.env.VLMATCH_STAKING_POOL_CONTRACT,
      VLMatchStakingPoolABI,
      provider,
    );
    this.MesLbrStakingPoolContract = new ethers.Contract(
      process.env.MESLBR_STAKING_POOL_CONTRACT,
      MesLbrStakingPoolABI,
      provider,
    );
    this.WETHContract = new ethers.Contract(
      process.env.WETH_CONTRACT,
      TokenABI,
      provider,
    );
    this.LBRContract = new ethers.Contract(
      process.env.LBR_CONTRACT,
      TokenABI,
      provider,
    );
  }
}
