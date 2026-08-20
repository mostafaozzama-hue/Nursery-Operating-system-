import { ApiProperty } from '@nestjs/swagger';

export class PaymentSummaryResponseDto {
  @ApiProperty({ description: 'Sum of Payment.amount with paidAt within [from, to) - cash basis, labeled "Collected", never "Revenue".' })
  collectedAmount!: string;
}
