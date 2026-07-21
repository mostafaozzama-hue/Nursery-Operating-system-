import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  childId!: string;

  @ApiPropertyOptional()
  classroomId!: string | null;

  @ApiProperty()
  date!: Date;

  @ApiPropertyOptional()
  checkInTime!: Date | null;

  @ApiPropertyOptional()
  checkOutTime!: Date | null;

  @ApiProperty({ enum: ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT'] })
  status!: string;

  @ApiPropertyOptional()
  checkedInBy!: string | null;

  @ApiPropertyOptional()
  checkedOutBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
