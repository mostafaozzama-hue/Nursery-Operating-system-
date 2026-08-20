import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChildResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  dateOfBirth!: Date;

  @ApiPropertyOptional()
  gender!: string | null;

  @ApiPropertyOptional()
  photoUrl!: string | null;

  @ApiPropertyOptional()
  nickname!: string | null;

  @ApiPropertyOptional()
  nationality!: string | null;

  @ApiPropertyOptional()
  motherLanguage!: string | null;

  @ApiPropertyOptional()
  address!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
