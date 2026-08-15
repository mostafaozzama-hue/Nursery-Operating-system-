import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChildFeeAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  childId!: string;

  @ApiProperty()
  feeId!: string;

  @ApiProperty()
  snapshotAmount!: number;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true, description: 'Null = currently open-ended' })
  effectiveTo!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
