import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UserSignatureDto } from './dto/auth.dto';
import { VerificationReason, VerificationResult } from 'src/types/auth';
import { RedisClientType } from 'redis';
import { ethers } from 'ethers';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly secretKey: string;

  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  @Inject(JwtService)
  private jwtService: JwtService;

  constructor() {
    this.secretKey = process.env.SECRET_KEY;
  }

  async challege(publicAddress: string) {
    const timeStamp = Date.now().toString();
    const message = this.generateChallengeMessage(timeStamp);
    await this.redisClient.setEx(`challenge:${publicAddress}`, 300, message);
    return message;
  }

  async verify(data: UserSignatureDto) {
    const message = await this.redisClient.get(
      `challenge:${data.publicAddress}`,
    );
    await this.redisClient.del(`challenge:${data.publicAddress}`);
    if (!message) {
      return { valid: false, reason: VerificationReason.SIGNATURE_TIMEOUT };
    }

    const recoveredAddress = ethers.verifyMessage(message, data.signature);

    if (recoveredAddress.toLowerCase() === data.publicAddress.toLowerCase()) {
      const token = await this.jwtService.signAsync({
        user: {
          public_address: ethers.getAddress(data.publicAddress),
        },
      });
      return {
        valid: true,
        reason: VerificationReason.SIGNATURE_VALID,
        token,
      };
    } else {
      return { valid: false, reason: VerificationReason.SIGNATURE_INVALID };
    }
  }

  generateChallengeMessage = (timestamp: string) => {
    const random = crypto.randomBytes(32);
    const hash = crypto
      .createHmac('sha256', this.secretKey)
      .update(timestamp + random)
      .digest('hex');
    return hash;
  };
}
