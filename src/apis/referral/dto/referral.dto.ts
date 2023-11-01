import { IsNotEmpty } from 'class-validator';

export class ReferralDto {
  @IsNotEmpty()
  referralCode: string;
}
