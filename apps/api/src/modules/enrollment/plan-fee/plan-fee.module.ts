import { Module } from '@nestjs/common';
import { PlanFeeController } from './plan-fee.controller';
import { PlanFeeRepository } from './plan-fee.repository';
import { PlanFeeService } from './plan-fee.service';

@Module({
  controllers: [PlanFeeController],
  providers: [PlanFeeService, PlanFeeRepository],
})
export class PlanFeeModule {}
