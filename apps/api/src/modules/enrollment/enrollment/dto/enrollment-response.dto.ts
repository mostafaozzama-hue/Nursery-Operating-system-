import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  childId!: string;

  @ApiPropertyOptional()
  classroomId!: string | null;

  @ApiProperty({ enum: ['WAITLISTED', 'ACTIVE', 'WITHDRAWN'] })
  status!: string;

  @ApiProperty()
  startDate!: Date;

  @ApiPropertyOptional()
  endDate!: Date | null;

  @ApiPropertyOptional()
  createdReason!: string | null;

  @ApiPropertyOptional()
  endedReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
