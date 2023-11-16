import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('liquidation_info')
export class LiquidationInfoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
  })
  pool: string;

  @Column({
    type: 'varchar',
  })
  user_address: string;

  @Column({
    type: 'varchar',
  })
  principal: string;

  @Column({
    type: 'varchar',
  })
  interest_amount: string;

  @Column({
    type: 'varchar',
  })
  acc_interest_amount: string;

  @Column({
    type: 'varchar',
  })
  interest_timestamp: string;
}
