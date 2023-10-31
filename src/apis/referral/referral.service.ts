import { HttpException, Injectable } from '@nestjs/common';
import { ReferralDto } from './dto/referral.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ReferralEntity } from './entitites/referral.entity';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(ReferralEntity)
    private readonly referralRepository: Repository<ReferralEntity>,
  ) {}

  async referralUser(data: ReferralDto) {
    if (
      data.refererAddress.toLowerCase() === data.referredAddress.toLowerCase()
    ) {
      throw new HttpException('Invalid referral address', 400);
    }
    const newReferral = this.referralRepository.create();
    newReferral.referer_address = ethers.getAddress(data.refererAddress);
    newReferral.referred_address = ethers.getAddress(data.referredAddress);
    await this.referralRepository.save(newReferral);
    return 'Referral relationship created';
  }
}
