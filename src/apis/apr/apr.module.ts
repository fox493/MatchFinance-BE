import { Module } from '@nestjs/common';
import { AprService } from './apr.service';
import { AprController } from './apr.controller';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountPoints } from '../airdrop/entities/account_points.entity';
import { ContractService } from 'src/contract/contract.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountPoints])],
  controllers: [AprController],
  providers: [
    AprService,
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
export class AprModule {}
