import { Module } from '@nestjs/common';
import { InvoiceModule } from '../invoice/invoice.module';
import { ManualOverrideModule } from '../manual-override/manual-override.module';
import { OneTimeChargeController } from './one-time-charge.controller';
import { OneTimeChargeRepository } from './one-time-charge.repository';
import { OneTimeChargeService } from './one-time-charge.service';

@Module({
  imports: [InvoiceModule, ManualOverrideModule],
  controllers: [OneTimeChargeController],
  providers: [OneTimeChargeService, OneTimeChargeRepository],
})
export class OneTimeChargeModule {}
