import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { CryptoService } from 'src/crypto/crypto.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEntity } from './entitites/referral.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralEntity])],
  controllers: [ReferralController],
  providers: [ReferralService, CryptoService],
})
export class ReferralModule {}
