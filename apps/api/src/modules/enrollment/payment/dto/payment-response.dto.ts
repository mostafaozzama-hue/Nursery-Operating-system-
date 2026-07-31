import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  guardianId!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  paymentMethod!: string;

  @ApiProperty()
  paidAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
