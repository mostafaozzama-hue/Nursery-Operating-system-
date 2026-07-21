import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive } from 'class-validator';

export const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class RecordPaymentDto {
  @ApiProperty({ example: 250.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Defaults to now' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
