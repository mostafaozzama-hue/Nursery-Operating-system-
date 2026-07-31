import { Module } from '@nestjs/common';
import { ChildDiscountAssignmentModule } from '../child-discount-assignment/child-discount-assignment.module';
import { ChildFeeAssignmentModule } from '../child-fee-assignment/child-fee-assignment.module';
import { EnrollmentBillingTermsModule } from '../enrollment-billing-terms/enrollment-billing-terms.module';
import { PlanFeeModule } from '../plan-fee/plan-fee.module';
import { PlanPriceModule } from '../plan-price/plan-price.module';
import { SiblingDiscountTierModule } from '../sibling-discount-tier/sibling-discount-tier.module';
import { WaiverModule } from '../waiver/waiver.module';
import { PricingEngineService } from './pricing-engine.service';

@Module({
  imports: [
    EnrollmentBillingTermsModule,
    PlanPriceModule,
    PlanFeeModule,
    ChildFeeAssignmentModule,
    ChildDiscountAssignmentModule,
    SiblingDiscountTierModule,
    WaiverModule,
  ],
  providers: [PricingEngineService],
  exports: [PricingEngineService],
})
export class PricingEngineModule {}
