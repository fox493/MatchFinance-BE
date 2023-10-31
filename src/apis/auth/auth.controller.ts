import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserSignatureDto, UserChallengeDto } from './dto/auth.dto';
import { VerificationReason } from 'src/types/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  @HttpCode(200)
  async challenge(@Body(ValidationPipe) user: UserChallengeDto) {
    const challengeMessage = await this.authService.challege(
      user.publicAddress,
    );
    return {
      challengeMessage,
      expireIn: 60 * 5,
    };
  }

  @Post('verify')
  async verify(@Body(ValidationPipe) data: UserSignatureDto) {
    const result = await this.authService.verify(data);
    if (result.valid) {
      return {
        token: result.token,
      };
    } else {
      if (result.reason === VerificationReason.SIGNATURE_INVALID) {
        throw new HttpException(
          'Signature did not match.',
          HttpStatus.FORBIDDEN,
        );
      } else if (result.reason === VerificationReason.SIGNATURE_TIMEOUT) {
        throw new HttpException('Signature timeout.', HttpStatus.UNAUTHORIZED);
      }
    }
  }
}
