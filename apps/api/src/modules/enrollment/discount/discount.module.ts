import { Module } from '@nestjs/common';
import { DiscountController } from './discount.controller';
import { DiscountRepository } from './discount.repository';
import { DiscountService } from './discount.service';

@Module({
  controllers: [DiscountController],
  providers: [DiscountService, DiscountRepository],
})
export class DiscountModule {}
