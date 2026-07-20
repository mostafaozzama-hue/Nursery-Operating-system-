import { Module } from '@nestjs/common';
import { GuardianController } from './guardian.controller';
import { GuardianRepository } from './guardian.repository';
import { GuardianService } from './guardian.service';

@Module({
  controllers: [GuardianController],
  providers: [GuardianService, GuardianRepository],
})
export class GuardianModule {}
