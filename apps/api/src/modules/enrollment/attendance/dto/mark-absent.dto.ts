import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MarkAbsentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  childId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Defaults to the classroom from the child\'s current active enrollment, if any' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;
}
