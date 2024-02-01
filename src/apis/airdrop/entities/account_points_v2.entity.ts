import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('account_points_v2')
export class AccountPointsV2 {
  @PrimaryColumn()
  address: string;

  @Column({
    default: 0,
  })
  steth_supplied: number;

  @Column({
    default: 0,
  })
  steth_withdrew: number;

  @Column({
    default: 0,
  })
  lp_staked: number;

  @Column({
    default: 0,
  })
  lp_withdrew: number;

  @Column({
    default: 0,
  })
  match_staked: number;

  @Column({
    default: 0,
  })
  match_unstaked: number;

  @Column({
    default: 0,
  })
  tvl: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否在airdrop开始后提取过',
  })
  withdrew_after_airdrp_start: boolean;

  @Column({type: 'int', default: 0})
  base_points: number;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'double', default: 1 })
  tvl_factor: number;

  @Column({ type: 'double', default: 1 })
  time_factor: number;

  @Column({ type: 'int', default: 0 })
  referral_points: number;
}
