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
  // WaiverRepository exported alongside the service (Easy Enrollment,
  // Product Gap H phase 2) - AdmissionRepository is a cross-module consumer
  // that only needs the composable, explicit-tenantId createWithinTx
  // primitive, same reason ChildModule/GuardianModule/etc already export
  // theirs.
  exports: [WaiverService, WaiverRepository],
})
export class WaiverModule {}
