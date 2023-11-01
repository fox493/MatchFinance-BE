import { IsNotEmpty } from 'class-validator';

export class RecordUserDataDto {
  @IsNotEmpty()
  publicAddress: string;

  @IsNotEmpty()
  trafficSource: number;
}
