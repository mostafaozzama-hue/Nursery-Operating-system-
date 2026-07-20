import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

export const RELATIONSHIP_TYPES = [
  'MOTHER',
  'FATHER',
  'GRANDPARENT',
  'LEGAL_GUARDIAN',
  'RELATIVE',
  'OTHER',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export class CreateChildGuardianDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  childId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guardianId!: string;

  @ApiProperty({ enum: RELATIONSHIP_TYPES })
  @IsIn(RELATIONSHIP_TYPES)
  relationshipType!: RelationshipType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canPickup?: boolean = false;
}
