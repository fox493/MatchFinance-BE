import { Controller, Get } from '@nestjs/common';
import { AprService } from './apr.service';
import { CronExpression } from '@nestjs/schedule';

@Controller('apr')
export class AprController {
  constructor(private readonly aprService: AprService) {}

  @Get('')
  getApyDate() {
    return this.aprService.getApyData();
  }
}
