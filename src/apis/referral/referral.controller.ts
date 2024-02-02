import {
  Body,
  Controller,
  Post,
  UseGuards,
  ValidationPipe,
  Request,
  Param,
  HttpCode,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { ReferralDto } from './dto/referral.dto';
import { LoginGuard } from 'src/guards/login.guard';
import { AuthorziedRequest } from 'src/types/auth';
import { OKXGuard } from 'src/guards/okx.guard';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('/code')
  @UseGuards(LoginGuard)
  async generateReferralCode(@Request() req: AuthorziedRequest) {
    return this.referralService.getReferralCode(req.user.public_address);
  }

  @Post('/')
  @UseGuards(LoginGuard)
  async referralUser(
    @Body(ValidationPipe) data: ReferralDto,
    @Request() req: AuthorziedRequest,
  ) {
    return this.referralService.referralUser(
      data.referralCode,
      req.user.public_address,
    );
  }

  @Post('/okx/:address')
  @HttpCode(200)
  @UseGuards(OKXGuard)
  async okxReferralUser(@Param('address') address: string) {
    return this.referralService.okxRerralUser(address);
  }
}
