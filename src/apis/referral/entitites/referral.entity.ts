import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('referrals')
export class ReferralEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  referer_address: string;

  @Column({
    comment: '被邀请人',
  })
  referred_address: string;
}
