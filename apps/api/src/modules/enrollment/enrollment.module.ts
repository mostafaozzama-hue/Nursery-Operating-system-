import { Module } from '@nestjs/common';
import { AttendanceModule } from './attendance/attendance.module';
import { ChildModule } from './child/child.module';
import { ChildGuardianModule } from './child-guardian/child-guardian.module';
import { ClassroomModule } from './classroom/classroom.module';
// Aliased: this file's own class is also EnrollmentModule (the umbrella
// grouping module) - the entity module keeps the name matching its
// Classroom/Child siblings, so only this import needs disambiguating.
import { EnrollmentModule as EnrollmentRecordModule } from './enrollment/enrollment.module';
import { GuardianModule } from './guardian/guardian.module';
import { InvoiceModule } from './invoice/invoice.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ClassroomModule,
    ChildModule,
    EnrollmentRecordModule,
    GuardianModule,
    ChildGuardianModule,
    StaffModule,
    AttendanceModule,
    InvoiceModule,
  ],
})
export class EnrollmentModule {}
