import { Module } from '@nestjs/common';
import { PlanPriceController } from './plan-price.controller';
import { PlanPriceRepository } from './plan-price.repository';
import { PlanPriceService } from './plan-price.service';

@Module({
  controllers: [PlanPriceController],
  providers: [PlanPriceService, PlanPriceRepository],
})
export class PlanPriceModule {}
