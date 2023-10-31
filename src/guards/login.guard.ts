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
export class LoginGuard implements CanActivate {
  @Inject(JwtService)
  private jwtService: JwtService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const authorization = request.header('Authorization') || '';

    const bearer = authorization.split(' ');

    if (!bearer || bearer.length < 2) {
      throw new UnauthorizedException(
        'Unauthorized! Please login with centralized account first',
      );
    }

    const token = bearer[1];
    let info: any;
    try {
      info = this.jwtService.verify(token);
      (request as any).user = info.user;
    } catch (e) {
      throw new UnauthorizedException('Token expired');
    }

    return true;
  }
}
