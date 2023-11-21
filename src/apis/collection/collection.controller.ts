import { Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { Response } from 'express';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post('twitter-redirect-amount')
  @HttpCode(200)
  async recordTwitterRedirectAmount(@Res() res: Response) {
    await this.collectionService.recordTwitterRedirectAmount();

    res.redirect('https://twitter.com/MatchFinance');

    return res;
  }

  @Get('twitter-redirect-amount')
  @HttpCode(200)
  async getTwitterRedirectAmount() {
    return await this.collectionService.getTwitterRedirectAmount();
  }
}
