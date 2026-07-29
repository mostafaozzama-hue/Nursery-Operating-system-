import { Module } from '@nestjs/common';
import { CapacityModule } from '../capacity/capacity.module';
import { EnrollmentBillingTermsController } from './enrollment-billing-terms.controller';
import { EnrollmentBillingTermsRepository } from './enrollment-billing-terms.repository';
import { EnrollmentBillingTermsService } from './enrollment-billing-terms.service';

@Module({
  imports: [CapacityModule],
  controllers: [EnrollmentBillingTermsController],
  providers: [EnrollmentBillingTermsService, EnrollmentBillingTermsRepository],
  exports: [EnrollmentBillingTermsService],
})
export class EnrollmentBillingTermsModule {}
