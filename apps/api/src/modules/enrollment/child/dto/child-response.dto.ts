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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
