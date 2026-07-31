import { Module } from '@nestjs/common';
import { ChildDiscountAssignmentModule } from '../child-discount-assignment/child-discount-assignment.module';
import { ChildFeeAssignmentModule } from '../child-fee-assignment/child-fee-assignment.module';
import { EnrollmentBillingTermsModule } from '../enrollment-billing-terms/enrollment-billing-terms.module';
import { PlanFeeModule } from '../plan-fee/plan-fee.module';
import { PlanPriceModule } from '../plan-price/plan-price.module';
import { SiblingDiscountTierModule } from '../sibling-discount-tier/sibling-discount-tier.module';
import { PricingEngineService } from './pricing-engine.service';

// No WaiverModule import - PricingEngineService reads waivers directly
// (see pricing-engine.service.ts's findEffectiveWaivers), mirroring
// CapacityService's precedent, specifically to avoid the circular module
// dependency WaiverService.applyRetroactively's own need for
// PricingEngineService would otherwise create.
@Module({
  imports: [
    EnrollmentBillingTermsModule,
    PlanPriceModule,
    PlanFeeModule,
    ChildFeeAssignmentModule,
    ChildDiscountAssignmentModule,
    SiblingDiscountTierModule,
  ],
  providers: [PricingEngineService],
  exports: [PricingEngineService],
})
export class PricingEngineModule {}
