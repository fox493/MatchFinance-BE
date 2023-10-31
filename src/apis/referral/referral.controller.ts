import {
  Body,
  Controller,
  Post,
  UseGuards,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { ReferralDto } from './dto/referral.dto';
import { LoginGuard } from 'src/guards/login.guard';
import { AuthorziedRequest } from 'src/types/auth';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('/')
  @UseGuards(LoginGuard)
  async referralUser(
    @Body(ValidationPipe) data: ReferralDto,
    @Request() req: AuthorziedRequest,
  ) {
    if (
      req.user.public_address.toLowerCase() !==
      data.referredAddress.toLowerCase()
    ) {
      throw new Error('Invalid referral address');
    }
    return this.referralService.referralUser(data);
  }
}
