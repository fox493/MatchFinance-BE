import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ReferralDto } from './dto/referral.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ReferralEntity } from './entitites/referral.entity';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { CryptoService } from 'src/crypto/crypto.service';
import { ReferralCodeEntity } from './entitites/referralCode.entity';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(ReferralEntity)
    private readonly referralRepository: Repository<ReferralEntity>,
    @InjectRepository(ReferralCodeEntity)
    private readonly referralCodeRepository: Repository<ReferralCodeEntity>,
    private readonly cryptoService: CryptoService,
  ) {}

  async getReferralCode(publicAddress: string) {
    const codes = await this.referralCodeRepository.find();
    const referral = await this.referralRepository.findOneBy({
      referred_address: publicAddress,
    });
    const foundCode = codes.find((code) => code.address === publicAddress);
    const referrer = referral?.referer_address
      ? codes.find((code) => code.address === referral?.referer_address)
      : null;
    if (foundCode) {
      return {
        code: foundCode.code,
        referrer: referrer?.address || '',
        referrerCode: referrer?.code || '',
      };
    } else {
      return this.generateReferralCode(publicAddress);
    }
  }

  async generateReferralCode(publicAddress: string) {
    const code = this.cryptoService.generateShorUUID(publicAddress);
    const foundCode = await this.referralCodeRepository.findOneBy({ code });
    if (foundCode) {
      return this.generateReferralCode(publicAddress);
    } else {
      const newReferralCode = this.referralCodeRepository.create();
      newReferralCode.address = publicAddress;
      newReferralCode.code = code;
      await this.referralCodeRepository.save(newReferralCode);
      return { code };
    }
  }

  async referralUser(referralCode: string, publicAddress: string) {
    const code = await this.referralCodeRepository.findOneBy({
      code: referralCode,
    });
    if (!code) {
      throw new HttpException('Referral code does not exist', 400);
    }
    if (code.address === publicAddress) {
      throw new HttpException('You cannot referral yourself', 400);
    }
    const referral = await this.referralRepository.findOneBy({
      referred_address: publicAddress,
    });
    if (referral) {
      throw new HttpException('You have already been referred', 400);
    }
    const newReferral = this.referralRepository.create();
    newReferral.referer_address = ethers.getAddress(code.address);
    newReferral.referred_address = ethers.getAddress(publicAddress);
    await this.referralRepository.save(newReferral);
    return 'Referral relationship created';
  }

  async okxRerralUser(publicAddress: string) {
    const referral = await this.referralRepository.findOneBy({
      referred_address: publicAddress,
    });
    if (!ethers.isAddress(publicAddress)) {
      throw new HttpException('Invalid address', 400);
    }
    if (referral) {
      throw new HttpException('Already been referred', 400);
    }
    const newReferral = this.referralRepository.create();
    newReferral.referer_address = process.env.OKX_AIRDROP2_WALLET;
    newReferral.referred_address = ethers.getAddress(publicAddress);
    await this.referralRepository.save(newReferral);
    return 'Referral relationship created';
  }
}
