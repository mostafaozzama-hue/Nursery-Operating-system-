import { Module } from '@nestjs/common';
import { ChildPhotoStorageService } from './child-photo-storage.service';
import { ChildController } from './child.controller';
import { ChildRepository } from './child.repository';
import { ChildService } from './child.service';

@Module({
  controllers: [ChildController],
  providers: [ChildService, ChildRepository, ChildPhotoStorageService],
  // ChildRepository exported alongside the service (Easy Enrollment, Product
  // Gap H) - AdmissionRepository is a cross-module consumer that only needs
  // the composable, explicit-tenantId createWithinTx primitive, same reason
  // EnrollmentBillingTermsModule already exports its repository.
  exports: [ChildService, ChildRepository],
})
export class ChildModule {}
