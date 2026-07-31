import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive } from 'class-validator';

// Order reflects ADR-0009 (regional-payment-methods-first-class): cash/
// wallet/bank-transfer are the market's actual dominant methods and come
// first; CREDIT_DEBIT_CARD is deliberately last, sequenced as Enterprise-tier
// per that ADR's "Future implications" - never re-prioritized back to the
// top. WALLET and CREDIT_DEBIT_CARD are deliberately provider/gateway-
// agnostic: WALLET covers Vodafone Cash/Orange Cash/Etisalat Cash/WE Pay
// etc. without the enum growing per provider, and CREDIT_DEBIT_CARD covers
// any future POS/gateway integration (Paymob, Stripe, ...) the same way -
// provider/gateway selection is a future concern layered on top of these
// values, not encoded into them.
export const PAYMENT_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'BANK_TRANSFER', 'CREDIT_DEBIT_CARD', 'OTHER'] as const;
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
