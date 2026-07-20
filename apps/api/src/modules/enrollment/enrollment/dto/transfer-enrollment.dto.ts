import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** No transfer date - takes effect immediately (closes the open row, opens a new one, same instant). */
export class TransferEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  newClassroomId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
