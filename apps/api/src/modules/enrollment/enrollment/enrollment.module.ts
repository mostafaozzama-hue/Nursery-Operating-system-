import { Module } from '@nestjs/common';
import { CapacityModule } from '../capacity/capacity.module';
import { EnrollmentBillingTermsModule } from '../enrollment-billing-terms/enrollment-billing-terms.module';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentRepository } from './enrollment.repository';
import { EnrollmentService } from './enrollment.service';

@Module({
  imports: [CapacityModule, EnrollmentBillingTermsModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentRepository],
  // EnrollmentRepository exported alongside the service (Easy Enrollment,
  // Product Gap H) - see ChildModule's export comment for the precedent.
  exports: [EnrollmentService, EnrollmentRepository],
})
export class EnrollmentModule {}
