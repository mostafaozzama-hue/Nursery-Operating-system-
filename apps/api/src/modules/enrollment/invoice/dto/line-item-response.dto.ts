import { ApiProperty } from '@nestjs/swagger';

export class LineItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  unitAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
