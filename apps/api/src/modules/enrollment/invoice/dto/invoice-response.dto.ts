import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  childId!: string;

  @ApiProperty()
  billedToGuardianId!: string;

  @ApiProperty({ enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'], description: 'OVERDUE is derived at read time, never stored' })
  status!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiPropertyOptional()
  dueDate!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
