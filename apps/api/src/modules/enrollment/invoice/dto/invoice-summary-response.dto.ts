import { ApiProperty } from '@nestjs/swagger';

export class InvoiceSummaryResponseDto {
  @ApiProperty({
    description:
      'Sum of totalAmount across ISSUED/PARTIALLY_PAID invoices, minus applied PaymentAllocations and CreditNotes - as of now, not period-scoped.',
  })
  outstandingAmount!: string;

  @ApiProperty({
    description: 'Same calculation as outstandingAmount, restricted to invoices whose dueDate is before tenant-local today.',
  })
  overdueAmount!: string;

  @ApiProperty({ description: 'Count of invoices contributing to overdueAmount.' })
  overdueInvoiceCount!: number;

  @ApiProperty({
    description: 'Sum of totalAmount for ISSUED/PARTIALLY_PAID/PAID invoices created within [from, to) - accrual basis, not cash collected.',
  })
  invoicedAmount!: string;
}
