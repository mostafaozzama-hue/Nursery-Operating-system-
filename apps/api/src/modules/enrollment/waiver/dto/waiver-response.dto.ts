import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WAIVER_REASON_CODES, WaiverReasonCode } from './waiver-reason-code';
import { WAIVER_TYPES, WaiverType } from './waiver-type';

export class WaiverResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  childId!: string;

  @ApiProperty({ enum: WAIVER_TYPES })
  type!: WaiverType;

  @ApiProperty()
  percentage!: number;

  @ApiProperty({ enum: WAIVER_REASON_CODES })
  reasonCode!: WaiverReasonCode;

  @ApiPropertyOptional({ nullable: true })
  reasonNote!: string | null;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true, description: 'Null = currently open-ended (requires reviewAnnually)' })
  effectiveTo!: Date | null;

  @ApiProperty()
  reviewAnnually!: boolean;

  @ApiProperty()
  approvedBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
