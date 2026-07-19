import { ApiProperty } from '@nestjs/swagger';
import { ClassroomResponseDto } from './classroom-response.dto';

export class PaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedClassroomResponseDto {
  @ApiProperty({ type: [ClassroomResponseDto] })
  data!: ClassroomResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
