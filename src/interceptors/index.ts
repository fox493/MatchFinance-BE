import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const excludePaths = ['nfts'];
    // 获取当前api版本
    const path = context.switchToHttp().getRequest().route.path.split('/')[2];
    if (excludePaths.includes(path)) {
      return next.handle();
    }
    const message =
      this.reflector.get<string>('message', context.getHandler()) || 'success';
    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        data,
        message,
      })),
    );
  }
}
