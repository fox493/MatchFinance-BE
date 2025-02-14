import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDataEntity } from './entities/user-data.entity';
import { Repository } from 'typeorm';
import { RecordUserDataDto } from './dto/record.dto';
import { ethers } from 'ethers';
import { AccountPoints } from '../airdrop/entities/account_points.entity';

@Injectable()
export class UserDataService {
  constructor(
    @InjectRepository(UserDataEntity)
    private readonly userDataRepository: Repository<UserDataEntity>,
    @InjectRepository(AccountPoints)
    private readonly accountPointsRepository: Repository<AccountPoints>,
  ) {}

  async getUserDataList() {
    const userData = await this.userDataRepository.find();
    const accountPoints = await this.accountPointsRepository.find();
    let res = [];
    userData.forEach((data) => {
      let resData = {
        ...data,
        tvl: 0,
      };
      const account = accountPoints.find(
        (account) => account.address === data.public_address,
      );
      if (account) {
        resData.tvl = account.tvl;
      }
      res.push(resData);
    });
    return res.sort((a, b) => b.traffic_source - a.traffic_source);
  }

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
