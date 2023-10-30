import { Module } from '@nestjs/common';
import { AprService } from './apr.service';
import { AprController } from './apr.controller';

@Module({
  controllers: [AprController],
  providers: [AprService]
})
export class AprModule {}
