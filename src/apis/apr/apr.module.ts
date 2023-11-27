import { Module } from '@nestjs/common';
import { AprService } from './apr.service';
import { AprController } from './apr.controller';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Module({
  controllers: [AprController],
  providers: [
    AprService,
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
