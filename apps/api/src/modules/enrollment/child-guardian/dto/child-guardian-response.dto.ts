import { ApiProperty } from '@nestjs/swagger';

export class ChildGuardianResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  childId!: string;

  @ApiProperty()
  guardianId!: string;

  @ApiProperty()
  relationshipType!: string;

  @ApiProperty()
  isPrimaryContact!: boolean;

  @ApiProperty()
  isEmergencyContact!: boolean;

  @ApiProperty()
  canPickup!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
