import { Module } from '@nestjs/common';
import { AirdropService } from './airdrop.service';
import { AirdropController } from './airdrop.controller';
import { ContractService } from 'src/contract/contract.service';
import { AccountPoints } from './entities/account_points.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEntity } from '../referral/entitites/referral.entity';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { AccountPointsV2 } from './entities/account_points_v2.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountPoints, AccountPointsV2, ReferralEntity]),
  ],
  controllers: [AirdropController],
  providers: [
    AirdropService,
    ContractService,
    {
      provide: 'REDIS_CLIENT',
      async useFactory(configService: ConfigService) {
        const client = createClient({
          socket: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
          },
        });
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
})
export class AirdropModule {}
