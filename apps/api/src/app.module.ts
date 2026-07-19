import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, IdentityModule, TenancyModule, EnrollmentModule],
  controllers: [HealthController],
})
export class AppModule {}
