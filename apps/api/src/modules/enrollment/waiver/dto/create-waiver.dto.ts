import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { WAIVER_REASON_CODES, WaiverReasonCode } from './waiver-reason-code';
import { WAIVER_TYPES, WaiverType } from './waiver-type';

export class CreateWaiverDto {
  @ApiProperty({ enum: WAIVER_TYPES })
  @IsIn(WAIVER_TYPES)
  type!: WaiverType;

  @ApiProperty({ example: 50, description: 'Percentage, 0-100' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage!: number;

  @ApiProperty({ enum: WAIVER_REASON_CODES })
  @IsIn(WAIVER_REASON_CODES)
  reasonCode!: WaiverReasonCode;

  @ApiPropertyOptional({ description: 'Required when reasonCode = OTHER' })
  @ValidateIf((dto: CreateWaiverDto) => dto.reasonCode === 'OTHER')
  @IsString()
  @IsNotEmpty()
  reasonNote?: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2027-09-01', description: 'Required unless reviewAnnually is true' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ default: false, description: 'Required (true) unless effectiveTo is set' })
  @IsOptional()
  @IsBoolean()
  reviewAnnually?: boolean = false;
}
