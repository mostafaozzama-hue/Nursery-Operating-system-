import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  userId!: string | null;

  @ApiPropertyOptional()
  classroomId!: string | null;

  @ApiPropertyOptional()
  position!: string | null;

  @ApiPropertyOptional()
  hireDate!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
