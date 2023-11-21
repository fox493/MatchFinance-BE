import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AirdropModule } from './apis/airdrop/airdrop.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract/contract.service';
import { AccountPoints } from './apis/airdrop/entities/account_points.entity';
import { AprModule } from './apis/apr/apr.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReferralModule } from './apis/referral/referral.module';
import { CryptoModule } from './crypto/crypto.module';
import { AuthModule } from './apis/auth/auth.module';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TransformInterceptor } from './interceptors';
import { HttpExceptionFilter } from './filters/http-execption.filter';
import { UserDataModule } from './apis/user-data/user-data.module';
import { UsersModule } from './apis/users/users.module';
import { LiquidationModule } from './liquidation/liquidation.module';
import { CollectionModule } from './apis/collection/collection.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'mysql',
          host: configService.get('db.host'),
          port: configService.get('db.port'),
          username: configService.get('db.username'),
          password: configService.get('db.password'),
          database: configService.get('db.database'),
          entites: [__dirname + '/../**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
          poolSize: 5,
          connectorPackage: 'mysql2',
        };
      },
    }),
    JwtModule.register({
      global: true,
      secret: 'match-finance-0x1',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    ScheduleModule.forRoot(),
    AirdropModule,
    AprModule,
    ReferralModule,
    CryptoModule,
    AuthModule,
    UserDataModule,
    UsersModule,
    LiquidationModule,
    CollectionModule,
  ],
  controllers: [],
  providers: [
    ContractService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
