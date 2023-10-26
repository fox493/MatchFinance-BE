import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AirdropModule } from './apis/airdrop/airdrop.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract/contract.service';
import { AccountPoints } from './apis/airdrop/entities/account_points.entity';
import { ScheduleModule } from '@nestjs/schedule';

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
    ScheduleModule.forRoot(),
    AirdropModule,
  ],
  controllers: [],
  providers: [ContractService],
})
export class AppModule {}
