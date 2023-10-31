import { Module } from '@nestjs/common';
import { AirdropService } from './airdrop.service';
import { AirdropController } from './airdrop.controller';
import { ContractService } from 'src/contract/contract.service';
import { AccountPoints } from './entities/account_points.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEntity } from '../referral/entitites/referral.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountPoints, ReferralEntity])],
  controllers: [AirdropController],
  providers: [AirdropService, ContractService],
})
export class AirdropModule {}
