import { Module } from '@nestjs/common';
import { ChildFeeAssignmentController } from './child-fee-assignment.controller';
import { ChildFeeAssignmentRepository } from './child-fee-assignment.repository';
import { ChildFeeAssignmentService } from './child-fee-assignment.service';

@Module({
  controllers: [ChildFeeAssignmentController],
  providers: [ChildFeeAssignmentService, ChildFeeAssignmentRepository],
})
export class ChildFeeAssignmentModule {}
