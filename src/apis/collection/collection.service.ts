import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class CollectionService {
  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  async recordTwitterRedirectAmount() {
    const amount = await this.redisClient.get('twitter_redirect_amount');
    if (!amount) {
      await this.redisClient.set('twitter_redirect_amount', 1);
    } else {
      await this.redisClient.set(
        'twitter_redirect_amount',
        parseInt(amount) + 1,
      );
    }
  }

  async getTwitterRedirectAmount() {
    const amount = await this.redisClient.get('twitter_redirect_amount');
    return amount;
  }
}
