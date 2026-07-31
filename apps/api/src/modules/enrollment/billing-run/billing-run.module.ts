import { Module } from '@nestjs/common';
import { EnrollmentBillingTermsModule } from '../enrollment-billing-terms/enrollment-billing-terms.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PricingEngineModule } from '../pricing-engine/pricing-engine.module';
import { BillingRunController } from './billing-run.controller';
import { BillingRunRepository } from './billing-run.repository';
import { BillingRunService } from './billing-run.service';

@Module({
  imports: [EnrollmentBillingTermsModule, InvoiceModule, PricingEngineModule],
  controllers: [BillingRunController],
  providers: [BillingRunService, BillingRunRepository],
  exports: [BillingRunService],
})
export class BillingRunModule {}
