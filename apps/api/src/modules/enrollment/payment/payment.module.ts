import { Module } from '@nestjs/common';
import { PaymentAllocationModule } from '../payment-allocation/payment-allocation.module';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

@Module({
  imports: [PaymentAllocationModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository],
  exports: [PaymentService],
})
export class PaymentModule {}
