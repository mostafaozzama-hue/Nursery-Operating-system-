import { ApiProperty } from '@nestjs/swagger';

export class BillingRunResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty({ enum: ['COMPLETED', 'PARTIAL_FAILURE'] })
  status!: string;

  @ApiProperty()
  runAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
