import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
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
export class AuthModule {}
