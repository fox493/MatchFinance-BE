import { Module } from '@nestjs/common';
import { LiquidationService } from './liquidation.service';
import { LiquidationController } from './liquidation.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ContractService } from 'src/contract/contract.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiquidationInfoEntity } from './entities/liquidation.entity';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LIQUIDATION_BOT',
        transport: Transport.TCP,
      },
    ]),
    TypeOrmModule.forFeature([LiquidationInfoEntity]),
  ],
  controllers: [LiquidationController],
  providers: [LiquidationService, ContractService],
})
export class LiquidationModule {}
