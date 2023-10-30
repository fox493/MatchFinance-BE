import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AirdropModule } from './apis/airdrop/airdrop.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract/contract.service';
import { AccountPoints } from './apis/airdrop/entities/account_points.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AprModule } from './apis/apr/apr.module';
import { ReferralModule } from './apis/referral/referral.module';
import { CryptoModule } from './crypto/crypto.module';

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
    // JwtModule.register({
    //   global: true,
    //   secret: 'multiverse-savior',
    //   signOptions: {
    //     expiresIn: '7d',
    //   },
    // }),
    ScheduleModule.forRoot(),
    AirdropModule,
    AprModule,
    ReferralModule,
    CryptoModule,
  ],
  controllers: [],
  providers: [ContractService],
})
export class AppModule {}
