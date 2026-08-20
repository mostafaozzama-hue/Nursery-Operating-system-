import { Module } from '@nestjs/common';
import { ChildDiscountAssignmentModule } from '../child-discount-assignment/child-discount-assignment.module';
import { ChildFeeAssignmentModule } from '../child-fee-assignment/child-fee-assignment.module';
import { ChildGuardianModule } from '../child-guardian/child-guardian.module';
import { ChildModule } from '../child/child.module';
import { EnrollmentModule as EnrollmentRecordModule } from '../enrollment/enrollment.module';
import { GuardianModule } from '../guardian/guardian.module';
import { WaiverModule } from '../waiver/waiver.module';
import { AdmissionController } from './admission.controller';
import { AdmissionRepository } from './admission.repository';
import { AdmissionService } from './admission.service';

/**
 * Easy Enrollment (Product Gap H). Imports the existing entity modules
 * purely to reuse their exported Repositories' createWithinTx primitives -
 * no domain logic lives in this module. See AdmissionRepository's doc
 * comment.
 */
@Module({
  imports: [
    ChildModule,
    GuardianModule,
    ChildGuardianModule,
    EnrollmentRecordModule,
    ChildFeeAssignmentModule,
    ChildDiscountAssignmentModule,
    WaiverModule,
  ],
  controllers: [AdmissionController],
  providers: [AdmissionService, AdmissionRepository],
})
export class AdmissionModule {}
