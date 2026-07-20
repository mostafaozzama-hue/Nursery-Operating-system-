import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { RELATIONSHIP_TYPES, RelationshipType } from './create-child-guardian.dto';

/** Deliberately excludes childId/guardianId - changing which pairing this is should be unlink + relink, not an in-place identity change. */
export class UpdateChildGuardianDto {
  @ApiPropertyOptional({ enum: RELATIONSHIP_TYPES })
  @IsOptional()
  @IsIn(RELATIONSHIP_TYPES)
  relationshipType?: RelationshipType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canPickup?: boolean;
}
