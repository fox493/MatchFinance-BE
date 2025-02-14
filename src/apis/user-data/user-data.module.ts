import { Module } from '@nestjs/common';
import { UserDataService } from './user-data.service';
import { UserDataController } from './user-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDataEntity } from './entities/user-data.entity';
import { AccountPoints } from '../airdrop/entities/account_points.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserDataEntity, AccountPoints])],
  controllers: [UserDataController],
  providers: [UserDataService],
})
export class UserDataModule {}
