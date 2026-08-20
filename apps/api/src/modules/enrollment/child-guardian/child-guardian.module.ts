import { Module } from '@nestjs/common';
import { ChildGuardianController } from './child-guardian.controller';
import { ChildGuardianRepository } from './child-guardian.repository';
import { ChildGuardianService } from './child-guardian.service';

@Module({
  controllers: [ChildGuardianController],
  providers: [ChildGuardianService, ChildGuardianRepository],
  // ChildGuardianRepository exported alongside the service (Easy Enrollment,
  // Product Gap H) - see ChildModule's export comment for the precedent.
  exports: [ChildGuardianService, ChildGuardianRepository],
})
export class ChildGuardianModule {}
