import { Module } from '@nestjs/common';
import { AirdropService } from './airdrop.service';
import { AirdropController } from './airdrop.controller';
import { ContractService } from 'src/contract/contract.service';
import { AccountPoints } from './entities/account_points.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AccountPoints])],
  controllers: [AirdropController],
  providers: [AirdropService, ContractService],
})
export class AirdropModule {}
