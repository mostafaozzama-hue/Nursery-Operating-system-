import { Module } from '@nestjs/common';
import { ChildDiscountAssignmentController } from './child-discount-assignment.controller';
import { ChildDiscountAssignmentRepository } from './child-discount-assignment.repository';
import { ChildDiscountAssignmentService } from './child-discount-assignment.service';

@Module({
  controllers: [ChildDiscountAssignmentController],
  providers: [ChildDiscountAssignmentService, ChildDiscountAssignmentRepository],
})
export class ChildDiscountAssignmentModule {}
