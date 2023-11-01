import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('referral_code')
export class ReferralCodeEntity {
  @PrimaryColumn()
  address: string;

  @Column()
  code: string;
}
