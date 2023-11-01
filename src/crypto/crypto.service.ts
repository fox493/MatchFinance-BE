import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

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

  generateShorUUID(publicAddress: string) {
    // 使用用户钱包地址的哈希值
    const sha256Hash = crypto
      .createHash('sha256')
      .update(publicAddress)
      .digest('hex');

    // 从哈希值中选择 6 个随机字符作为唯一标识符
    let shortUUID = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * sha256Hash.length);
      shortUUID += sha256Hash.charAt(randomIndex);
    }

    return shortUUID.toUpperCase();
  }
}
