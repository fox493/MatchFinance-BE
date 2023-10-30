import { Body, Controller, Post } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { ReferralDto } from './dto/referral.dto';

@Controller('referral')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly cryptoService: CryptoService,
  ) {}

  @Post('/')
  async referralUser(@Body() body: any) {
    const data = this.cryptoService.decrypt(body);
    return this.referralService.referralUser(data as unknown as ReferralDto);
  }
}
