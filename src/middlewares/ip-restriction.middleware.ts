import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class IpRestrictionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const allowedIp = process.env.ALLOWED_IP;

    if (req.ip !== allowedIp) {
      res.status(401).send('Unauthorized');
      return;
    }

    next();
  }
}
