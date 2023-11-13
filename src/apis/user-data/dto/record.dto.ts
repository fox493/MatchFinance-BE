import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class RecordUserDataDto {
  @IsNotEmpty()
  publicAddress: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(20)
  trafficSource: number;
}
