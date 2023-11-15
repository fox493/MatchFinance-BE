import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UsersEntity {
  @PrimaryColumn({
    type: 'varchar',
  })
  public_address: string;

  @Column({
    type: 'boolean',
  })
  has_signed: boolean;
}
