import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

/**
 * Corrections only - OWNER/ADMIN gated. checkedInBy/checkedOutBy are
 * deliberately absent: write-once actor references, never editable here.
 * status is always recomputed server-side from the resulting
 * checkInTime/checkOutTime state, never accepted directly.
 */
export class UpdateAttendanceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ example: '08:45', description: 'Set to null to clear' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'checkInTime must be in HH:mm or HH:mm:ss format' })
  checkInTime?: string | null;

  @ApiPropertyOptional({ example: '17:30', description: 'Set to null to clear' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'checkOutTime must be in HH:mm or HH:mm:ss format' })
  checkOutTime?: string | null;
}
