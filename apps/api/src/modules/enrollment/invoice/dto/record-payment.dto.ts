import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive } from 'class-validator';

// Order reflects ADR-0009 (regional-payment-methods-first-class): cash/
// wallet/bank-transfer are the market's actual dominant methods and come
// first; CARD is deliberately last, sequenced as Enterprise-tier per that
// ADR's "Future implications" - never re-prioritized back to the top.
export const PAYMENT_METHODS = [
  'CASH',
  'VODAFONE_CASH',
  'INSTAPAY',
  'BANK_TRANSFER',
  'CARD',
  'CHECK',
  'OTHER',
] as const;
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
