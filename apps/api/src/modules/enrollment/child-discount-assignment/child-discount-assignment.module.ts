import { Module } from '@nestjs/common';
import { ChildDiscountAssignmentController } from './child-discount-assignment.controller';
import { ChildDiscountAssignmentRepository } from './child-discount-assignment.repository';
import { ChildDiscountAssignmentService } from './child-discount-assignment.service';

@Module({
  controllers: [ChildDiscountAssignmentController],
  providers: [ChildDiscountAssignmentService, ChildDiscountAssignmentRepository],
  // ChildDiscountAssignmentRepository exported alongside the service (Easy
  // Enrollment, Product Gap H phase 2) - see ChildModule's export comment
  // for the precedent.
  exports: [ChildDiscountAssignmentService, ChildDiscountAssignmentRepository],
})
export class ChildDiscountAssignmentModule {}
