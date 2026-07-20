import { Module } from '@nestjs/common';
import { ChildModule } from './child/child.module';
import { ClassroomModule } from './classroom/classroom.module';

@Module({
  imports: [ClassroomModule, ChildModule],
})
export class EnrollmentModule {}
