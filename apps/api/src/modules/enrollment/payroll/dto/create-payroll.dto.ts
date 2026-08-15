import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

export const PAY_TYPES = ['HOURLY', 'SALARY'] as const;
export type PayType = (typeof PAY_TYPES)[number];

export const PAY_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

/** Simple and mutable, not historized - a payroll record is overwritten in place on a raise/change. */
export class CreatePayrollDto {
  @ApiProperty({ format: 'uuid', description: 'The staff member this payroll record belongs to' })
  @IsUUID()
  staffId!: string;

  @ApiProperty({ enum: PAY_TYPES })
  @IsIn(PAY_TYPES)
  payType!: PayType;

  @ApiProperty({ example: 22.5, description: 'Hourly rate or annual salary, depending on payType' })
  @IsNumber()
  @IsPositive()
  payRate!: number;

  @ApiProperty({ enum: PAY_FREQUENCIES })
  @IsIn(PAY_FREQUENCIES)
  payFrequency!: PayFrequency;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  currency: string = 'USD';

  @ApiProperty({ example: '2026-07-25' })
  @IsDateString()
  effectiveDate!: string;
}
