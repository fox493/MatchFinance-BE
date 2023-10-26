import { Controller, Get } from '@nestjs/common';
import { AirdropService } from './airdrop.service';

@Controller('airdrop')
export class AirdropController {
  constructor(private readonly airdropService: AirdropService) {}

  @Get('/leaderboard')
  async getLeaderboard() {
    return this.airdropService.getAccountPoints();
  }
}
