import { Module } from '@nestjs/common';
import { ManualOverrideRepository } from './manual-override.repository';
import { ManualOverrideService } from './manual-override.service';

/** No controller - deliberately minimal, see manual-override.repository.ts. */
@Module({
  providers: [ManualOverrideService, ManualOverrideRepository],
  exports: [ManualOverrideService],
})
export class ManualOverrideModule {}
