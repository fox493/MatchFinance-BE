import { HttpException, Injectable } from '@nestjs/common';
import { ReferralDto } from './dto/referral.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ReferralEntity } from './entitites/referral.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(ReferralEntity)
    private readonly referralRepository: Repository<ReferralEntity>,
  ) {}

  async referralUser(data: ReferralDto) {
    if (!data.referer_address || !data.referred_address) {
      throw new HttpException(
        'Missing referer_address or referred_address',
        400,
      );
    }
    const newReferral = this.referralRepository.create();
    newReferral.referer_address = data.referer_address;
    newReferral.referred_address = data.referred_address;
    return this.referralRepository.save(newReferral);
  }
}
