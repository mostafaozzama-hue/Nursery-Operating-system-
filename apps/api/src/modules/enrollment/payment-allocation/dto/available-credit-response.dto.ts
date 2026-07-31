import { ApiProperty } from '@nestjs/swagger';

export class AvailableCreditResponseDto {
  @ApiProperty({ description: 'Payment.amount recorded for this guardian minus PaymentAllocation.amountApplied - computed, never stored' })
  availableCredit!: string;
}
