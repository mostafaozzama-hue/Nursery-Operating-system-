import { Module } from '@nestjs/common';
import { InvoiceModule } from '../invoice/invoice.module';
import { PaymentAllocationController } from './payment-allocation.controller';
import { PaymentAllocationRepository } from './payment-allocation.repository';
import { PaymentAllocationService } from './payment-allocation.service';

@Module({
  imports: [InvoiceModule],
  controllers: [PaymentAllocationController],
  providers: [PaymentAllocationService, PaymentAllocationRepository],
  exports: [PaymentAllocationService],
})
export class PaymentAllocationModule {}
