import { Module } from '@nestjs/common';
import { HolidayController } from './holiday.controller';
import { HolidayRepository } from './holiday.repository';
import { HolidayService } from './holiday.service';

@Module({
  controllers: [HolidayController],
  providers: [HolidayService, HolidayRepository],
})
export class HolidayModule {}
