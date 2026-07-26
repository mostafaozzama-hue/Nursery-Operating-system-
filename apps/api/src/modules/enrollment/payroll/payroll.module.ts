import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollRepository } from './payroll.repository';
import { PayrollService } from './payroll.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
})
export class PayrollModule {}
