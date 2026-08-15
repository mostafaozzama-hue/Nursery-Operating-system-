import { Module } from '@nestjs/common';
import { CapacityModule } from '../capacity/capacity.module';
import { EnrollmentBillingTermsController } from './enrollment-billing-terms.controller';
import { EnrollmentBillingTermsRepository } from './enrollment-billing-terms.repository';
import { EnrollmentBillingTermsService } from './enrollment-billing-terms.service';

@Module({
  imports: [CapacityModule],
  controllers: [EnrollmentBillingTermsController],
  providers: [EnrollmentBillingTermsService, EnrollmentBillingTermsRepository],
  // EnrollmentBillingTermsRepository is exported alongside the service so
  // cross-module consumers that only need the composable, explicit-tenantId
  // methods (EnrollmentRepository, PricingEngineService, BillingRunService)
  // can depend on it directly instead of the request-scoped service - see
  // docs/SESSION_CHECKPOINT.md for the root-cause investigation this fixes.
  exports: [EnrollmentBillingTermsService, EnrollmentBillingTermsRepository],
})
export class EnrollmentBillingTermsModule {}
