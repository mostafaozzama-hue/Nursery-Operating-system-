import { resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/validate';
import { HealthController } from './health/health.controller';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: resolve(__dirname, '../../../.env'),
    }),
    PrismaModule,
    IdentityModule,
    TenancyModule,
    EnrollmentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
