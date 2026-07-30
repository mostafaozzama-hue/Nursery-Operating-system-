import { Module } from '@nestjs/common';
import { WaiverController } from './waiver.controller';
import { WaiverRepository } from './waiver.repository';
import { WaiverService } from './waiver.service';

@Module({
  controllers: [WaiverController],
  providers: [WaiverService, WaiverRepository],
})
export class WaiverModule {}
