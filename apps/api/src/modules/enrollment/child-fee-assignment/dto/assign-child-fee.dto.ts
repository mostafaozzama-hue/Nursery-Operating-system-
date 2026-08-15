import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class AssignChildFeeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  feeId!: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  effectiveFrom!: string;
}
