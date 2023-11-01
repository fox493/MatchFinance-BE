import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDataEntity } from './entities/user-data.entity';
import { Repository } from 'typeorm';
import { RecordUserDataDto } from './dto/record.dto';
import { ethers } from 'ethers';

@Injectable()
export class UserDataService {
  constructor(
    @InjectRepository(UserDataEntity)
    private readonly userDataRepository: Repository<UserDataEntity>,
  ) {}

  async recordUserData(data: RecordUserDataDto) {
    const user = await this.userDataRepository.findOneBy({
      public_address: data.publicAddress,
    });
    if (!user) {
      const newUser = this.userDataRepository.create();
      try {
        newUser.public_address = ethers.getAddress(data.publicAddress);
      } catch (error) {
        throw new HttpException('Invalid public address', 400);
      }
      newUser.traffic_source = data.trafficSource;
      return await this.userDataRepository.save(newUser);
    }
  }
}
