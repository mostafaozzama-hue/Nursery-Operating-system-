import { ApiProperty } from '@nestjs/swagger';

export class PlanFeeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty()
  feeId!: string;

  @ApiProperty()
  isMandatory!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
