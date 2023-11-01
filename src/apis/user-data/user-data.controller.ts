import {
  Body,
  Controller,
  HttpCode,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { UserDataService } from './user-data.service';
import { RecordUserDataDto } from './dto/record.dto';

@Controller('user-data')
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}

  @Post('/record')
  @HttpCode(200)
  async recordUserData(@Body(ValidationPipe) data: RecordUserDataDto) {
    return this.userDataService.recordUserData(data);
  }
}
