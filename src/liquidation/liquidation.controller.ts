import { Controller, Get, Param } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LiquidationService } from './liquidation.service';

@Controller('liquidation')
export class LiquidationController {
  constructor(private readonly liquidationService: LiquidationService) {}

  @Get(':poolAddress/borrowed')
  async list(@Param('poolAddress') poolAddress: string) {
    return await this.liquidationService.getLiquidationInfo(poolAddress);
  }
}
