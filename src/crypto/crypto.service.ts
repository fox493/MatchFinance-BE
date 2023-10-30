import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly privateKey: string;

  constructor() {
    this.privateKey = process.env.PRIVATE_KEY;
  }

  encrypt() {}

  decrypt(data: string) {
    const buffer = Buffer.from(data, 'base64');
    const res = crypto.privateDecrypt(this.privateKey, buffer);
    console.log(res.toString('utf8'));
  }
}
