import { Module } from '@nestjs/common';
import { SiblingDiscountTierController } from './sibling-discount-tier.controller';
import { SiblingDiscountTierRepository } from './sibling-discount-tier.repository';
import { SiblingDiscountTierService } from './sibling-discount-tier.service';

@Module({
  controllers: [SiblingDiscountTierController],
  providers: [SiblingDiscountTierService, SiblingDiscountTierRepository],
})
export class SiblingDiscountTierModule {}
