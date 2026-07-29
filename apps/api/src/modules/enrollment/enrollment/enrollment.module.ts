import { Module } from '@nestjs/common';
import { CapacityModule } from '../capacity/capacity.module';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentRepository } from './enrollment.repository';
import { EnrollmentService } from './enrollment.service';

@Module({
  imports: [CapacityModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentRepository],
})
export class EnrollmentModule {}
