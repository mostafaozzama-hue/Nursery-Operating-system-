import { Module } from '@nestjs/common';
import { ClassroomModule } from './classroom/classroom.module';

@Module({
  imports: [ClassroomModule],
})
export class EnrollmentModule {}
