import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { UserDataService } from './user-data.service';
import { RecordUserDataDto } from './dto/record.dto';

@Controller('user-data')
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}

  @Get('/list')
  @HttpCode(200)
  async getUserDataList() {
    return this.userDataService.getUserDataList();
  }

  @Post('/record')
  @HttpCode(200)
  async recordUserData(@Body(ValidationPipe) data: RecordUserDataDto) {
    return this.userDataService.recordUserData(data);
  }
}
