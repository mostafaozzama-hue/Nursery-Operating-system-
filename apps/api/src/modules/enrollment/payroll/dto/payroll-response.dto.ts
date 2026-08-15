import { ApiProperty } from '@nestjs/swagger';

export class PayrollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty({ enum: ['HOURLY', 'SALARY'] })
  payType!: string;

  @ApiProperty()
  payRate!: string;

  @ApiProperty({ enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] })
  payFrequency!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  effectiveDate!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
