import { Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { Response } from 'express';

@Controller('redirect')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get('twitter')
  @HttpCode(200)
  async recordTwitterRedirectAmount(@Res() res: Response) {
    await this.collectionService.recordTwitterRedirectAmount();

    res.redirect('https://twitter.com/MatchFinance');

    return res;
  }

  @Get('/data/twitter-redirect-amount')
  @HttpCode(200)
  async getTwitterRedirectAmount() {
    return await this.collectionService.getTwitterRedirectAmount();
  }
}
