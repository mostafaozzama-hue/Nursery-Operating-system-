import { Module } from '@nestjs/common';
import { BillingRunModule } from '../billing-run/billing-run.module';
import { CreditNoteModule } from '../credit-note/credit-note.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { ManualOverrideModule } from '../manual-override/manual-override.module';
import { PricingEngineModule } from '../pricing-engine/pricing-engine.module';
import { WaiverController } from './waiver.controller';
import { WaiverRepository } from './waiver.repository';
import { WaiverService } from './waiver.service';

@Module({
  imports: [InvoiceModule, BillingRunModule, PricingEngineModule, CreditNoteModule, ManualOverrideModule],
  controllers: [WaiverController],
  providers: [WaiverService, WaiverRepository],
  exports: [WaiverService],
})
export class WaiverModule {}
