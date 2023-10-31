import { IsNotEmpty } from 'class-validator';

export class ReferralDto {
  @IsNotEmpty()
  refererAddress: string;

  @IsNotEmpty()
  referredAddress: string;
}
