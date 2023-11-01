import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_data')
export class UserDataEntity {
  @PrimaryColumn()
  public_address: string;

  @Column({
    type: 'tinyint',
  })
  traffic_source: number;
}
