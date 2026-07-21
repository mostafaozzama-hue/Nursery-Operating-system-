import { Module } from '@nestjs/common';
import { ChildModule } from './child/child.module';
import { ChildGuardianModule } from './child-guardian/child-guardian.module';
import { ClassroomModule } from './classroom/classroom.module';
// Aliased: this file's own class is also EnrollmentModule (the umbrella
// grouping module) - the entity module keeps the name matching its
// Classroom/Child siblings, so only this import needs disambiguating.
import { EnrollmentModule as EnrollmentRecordModule } from './enrollment/enrollment.module';
import { GuardianModule } from './guardian/guardian.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [ClassroomModule, ChildModule, EnrollmentRecordModule, GuardianModule, ChildGuardianModule, StaffModule],
})
export class EnrollmentModule {}
