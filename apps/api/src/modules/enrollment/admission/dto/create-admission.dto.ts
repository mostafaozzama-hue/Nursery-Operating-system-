import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OpenBillingTermsDto } from '../../enrollment-billing-terms/dto/open-billing-terms.dto';
import { RELATIONSHIP_TYPES, RelationshipType } from '../../child-guardian/dto/create-child-guardian.dto';
import { CreateChildDto } from '../../child/dto/create-child.dto';
import { WAIVER_REASON_CODES, WaiverReasonCode } from '../../waiver/dto/waiver-reason-code';
import { WAIVER_TYPES, WaiverType } from '../../waiver/dto/waiver-type';

/**
 * One guardian entry in a CreateAdmissionDto.guardians array. Either
 * guardianId (reuse an existing Guardian - the "search existing" branch of
 * the wizard's Parents & Guardians step) or firstName+lastName (create a new
 * one inline) is expected, never both - enforced in AdmissionService, not
 * here, matching this codebase's existing preference for cross-field rules
 * living in the service layer (see CreateGuardianDto's own comment). No
 * fuzzy/automatic guardian matching (per product decision) - the wizard's
 * search-and-select UI is the entire duplicate-prevention mechanism; the
 * user always explicitly picks "use this guardian" or "create new".
 */
export class AdmissionGuardianInputDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Reuse this existing guardian instead of creating a new one' })
  @IsOptional()
  @IsUUID()
  guardianId?: string;

  @ApiPropertyOptional({ example: 'Sarah' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Ahmed' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ enum: RELATIONSHIP_TYPES })
  @IsIn(RELATIONSHIP_TYPES)
  relationshipType!: RelationshipType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canPickup?: boolean;
}

/**
 * One discount at enrollment time (Easy Enrollment, Product Gap H phase 2) -
 * deliberately a single optional slot, not an array, to keep the wizard
 * simple ("no giant unstructured form"). Reuses
 * ChildDiscountAssignmentRepository.assignWithinTx as-is, so the
 * exclusive-vs-stackable conflict check (Discount bug fix) applies exactly
 * as it does everywhere else. effectiveFrom is always today, matching
 * Enrollment's own startDate convention - not asked in the wizard.
 * Additional discounts stay addable later from the Child Detail page's
 * existing DiscountAssignmentsSection.
 */
export class AdmissionDiscountInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  discountId!: string;

  @ApiPropertyOptional({ description: 'For a bounded promotional discount, known upfront. Must be after today.' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

/**
 * One waiver at enrollment time (Easy Enrollment, Product Gap H phase 2) -
 * same "single slot, not an array" simplicity as the discount above.
 * Reuses WaiverRepository.createWithinTx as-is, so the duplicate-detection
 * guard (Waiver bug fix) applies exactly as it does everywhere else.
 * effectiveFrom is always today - not asked in the wizard. Additional
 * waivers stay addable later from the Child Detail page's existing
 * WaiversSection.
 */
export class AdmissionWaiverInputDto {
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
  @ValidateIf((dto: AdmissionWaiverInputDto) => dto.reasonCode === 'OTHER')
  @IsString()
  @IsNotEmpty()
  reasonNote?: string;

  @ApiPropertyOptional({ description: 'Required unless reviewAnnually is true. Must be after today.' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ default: false, description: 'Required (true) unless effectiveTo is set' })
  @IsOptional()
  @IsBoolean()
  reviewAnnually?: boolean;
}

/**
 * Orchestration input for the Easy Enrollment wizard (Product Gap H) - not a
 * new enrollment concept. AdmissionService composes the same Child/Guardian/
 * ChildGuardian/Enrollment primitives POST /children, POST /guardians,
 * POST /child-guardians and POST /enrollments already use, atomically, in
 * one request.
 */
export class CreateAdmissionDto {
  @ApiProperty({ type: CreateChildDto })
  @ValidateNested()
  @Type(() => CreateChildDto)
  child!: CreateChildDto;

  @ApiProperty({ type: [AdmissionGuardianInputDto], description: 'At least one guardian (mother/father/other)' })
  @ValidateNested({ each: true })
  @Type(() => AdmissionGuardianInputDto)
  @ArrayMinSize(1)
  guardians!: AdmissionGuardianInputDto[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Omit to enroll as WAITLISTED' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  createdReason?: string;

  @ApiPropertyOptional({
    description:
      'User-entered expected/target withdrawal date - informational only, distinct from the system-managed endDate. Never auto-invented; omit if unknown.',
  })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @ApiPropertyOptional({ type: OpenBillingTermsDto, description: 'Optional - omit to enroll without billing terms yet' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenBillingTermsDto)
  billingTerms?: OpenBillingTermsDto;

  @ApiPropertyOptional({ type: [String], format: 'uuid', description: 'Fee ids to assign at enrollment time (each effective from today)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  feeIds?: string[];

  @ApiPropertyOptional({ type: AdmissionDiscountInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdmissionDiscountInputDto)
  discount?: AdmissionDiscountInputDto;

  @ApiPropertyOptional({ type: AdmissionWaiverInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdmissionWaiverInputDto)
  waiver?: AdmissionWaiverInputDto;
}
