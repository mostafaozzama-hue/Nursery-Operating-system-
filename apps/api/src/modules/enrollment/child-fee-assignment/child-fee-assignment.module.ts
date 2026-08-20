import { Module } from '@nestjs/common';
import { ChildFeeAssignmentController } from './child-fee-assignment.controller';
import { ChildFeeAssignmentRepository } from './child-fee-assignment.repository';
import { ChildFeeAssignmentService } from './child-fee-assignment.service';

@Module({
  controllers: [ChildFeeAssignmentController],
  providers: [ChildFeeAssignmentService, ChildFeeAssignmentRepository],
  // ChildFeeAssignmentRepository exported alongside the service (Easy
  // Enrollment, Product Gap H phase 2) - see ChildModule's export comment
  // for the precedent.
  exports: [ChildFeeAssignmentService, ChildFeeAssignmentRepository],
})
export class ChildFeeAssignmentModule {}
