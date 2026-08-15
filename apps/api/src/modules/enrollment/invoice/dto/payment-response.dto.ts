import { ApiProperty } from '@nestjs/swagger';

/** One payment's application to this specific invoice, via PaymentAllocation - amountApplied is this invoice's own portion, not the payment's full amount (a payment can span several invoices). */
export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  amountApplied!: string;

  @ApiProperty()
  paymentMethod!: string;

  @ApiProperty()
  paidAt!: Date;

  @ApiProperty()
  createdAt!: Date;
}
