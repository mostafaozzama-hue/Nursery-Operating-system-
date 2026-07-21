import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MembershipResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  roleKey!: string;

  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] })
  status!: string;

  @ApiPropertyOptional()
  invitedAt!: Date | null;

  @ApiPropertyOptional()
  activatedAt!: Date | null;

  @ApiPropertyOptional()
  revokedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
