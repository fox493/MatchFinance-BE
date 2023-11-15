import {
  Request,
  Body,
  Controller,
  HttpCode,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthorziedRequest } from 'src/types/auth';
import { LoginGuard } from 'src/guards/login.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/disclaimer')
  @HttpCode(200)
  @UseGuards(LoginGuard)
  async signDisclaimer(@Request() req: AuthorziedRequest) {
    return this.usersService.signDisclaimer(req.user.public_address);
  }

  @Get('/info')
  @HttpCode(200)
  @UseGuards(LoginGuard)
  async getUserInfo(@Request() req: AuthorziedRequest) {
    return this.usersService.getUserInfo(req.user.public_address);
  }
}
