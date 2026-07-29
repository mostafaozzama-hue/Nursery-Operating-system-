import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEPOSIT_REFUND_POLICIES, DepositRefundPolicy } from './deposit-refund-policy';

export class EnrollmentBillingTermsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  enrollmentId!: string;

  @ApiPropertyOptional()
  planId!: string | null;

  @ApiProperty()
  billingGuardianId!: string;

  @ApiPropertyOptional()
  customRateAmount!: number | null;

  @ApiPropertyOptional()
  customRateReason!: string | null;

  @ApiPropertyOptional()
  depositAmount!: number | null;

  @ApiPropertyOptional({ enum: DEPOSIT_REFUND_POLICIES })
  depositRefundPolicy!: DepositRefundPolicy | null;

  @ApiPropertyOptional()
  withdrawalNoticeGivenDate!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
