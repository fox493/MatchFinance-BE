import { JwtService } from '@nestjs/jwt';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class OKXGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const key = request.header('key') || '';

    if (!key) {
      throw new UnauthorizedException('Unauthorized!');
    }

    if (key !== process.env.OKX_API_KEY) {
      throw new UnauthorizedException('Unauthorized!');
    }

    return true;
  }
}
