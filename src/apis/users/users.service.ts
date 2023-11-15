import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersEntity } from './entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly usersRepository: Repository<UsersEntity>,
  ) {}

  async getUserInfo(uesrId: string) {
    const foundUser = await this.usersRepository.findOne({
      where: {
        public_address: uesrId,
      },
    });
    if (foundUser) {
      return foundUser;
    } else {
      throw new Error('User not found');
    }
  }

  async signDisclaimer(userId: string) {
    const foundUser = await this.usersRepository.findOne({
      where: {
        public_address: userId,
      },
    });
    if (foundUser) {
      foundUser.has_signed = true;
      return this.usersRepository.save(foundUser);
    } else {
      const newUser = this.usersRepository.create();
      newUser.public_address = userId;
      newUser.has_signed = true;
      return this.usersRepository.save(newUser);
    }
  }
}
