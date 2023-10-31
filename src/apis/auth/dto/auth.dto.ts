import { IsNotEmpty } from 'class-validator';

export class UserChallengeDto {
  @IsNotEmpty()
  publicAddress: string;
}

export class UserSignatureDto {
  @IsNotEmpty()
  publicAddress: string;
  
  @IsNotEmpty()
  signature: string;
}
