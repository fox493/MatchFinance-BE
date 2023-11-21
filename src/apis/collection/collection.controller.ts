import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post('twitter-redirect-amount')
  @HttpCode(200)
  async recordTwitterRedirectAmount() {
    return await this.collectionService.recordTwitterRedirectAmount();
  }

  @Get('twitter-redirect-amount')
  @HttpCode(200)
  async getTwitterRedirectAmount() {
    return await this.collectionService.getTwitterRedirectAmount();
  }
}
