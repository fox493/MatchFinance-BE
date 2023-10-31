import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // 特殊处理 validaction exception
    if (exception instanceof BadRequestException) {
      exception = exception.getResponse() as any;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let resultMessage = exception.message;
    let resultCode = status;
    let resultParams = {};
    try {
      const { code, message, ...oth } = JSON.parse(exception.message);
      resultMessage = message;
      resultCode = code;
      resultParams = oth;
    } catch (e) {}
    // const message = exception.message;
    Logger.log(exception, '错误提示');
    const errorResponse = {
      status,
      message: resultMessage,
      code: resultCode, // 自定义code
      params: resultParams,
      path: request.url, // 错误的url地址
      method: request.method, // 请求方式
      timestamp: new Date().toLocaleDateString(), // 错误的时间
    };
    // 打印日志
    Logger.error(
      `【${request.method} ${request.url}】`,
      JSON.stringify(errorResponse),
      'HttpExceptionFilter',
    );
    // 设置返回的状态码、请求头、发送错误信息
    response.status(status);
    response.header('Content-Type', 'application/json; charset=utf-8');
    response.send(errorResponse);
  }
}
