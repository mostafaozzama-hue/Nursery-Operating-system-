import { Module } from '@nestjs/common';
import { FeeController } from './fee.controller';
import { FeeRepository } from './fee.repository';
import { FeeService } from './fee.service';

@Module({
  controllers: [FeeController],
  providers: [FeeService, FeeRepository],
  exports: [FeeService],
})
export class FeeModule {}
