import { Module } from '@nestjs/common';
import { ChildGuardianController } from './child-guardian.controller';
import { ChildGuardianRepository } from './child-guardian.repository';
import { ChildGuardianService } from './child-guardian.service';

@Module({
  controllers: [ChildGuardianController],
  providers: [ChildGuardianService, ChildGuardianRepository],
})
export class ChildGuardianModule {}
