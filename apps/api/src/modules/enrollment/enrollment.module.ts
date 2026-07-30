import { Module } from '@nestjs/common';
import { AttendanceModule } from './attendance/attendance.module';
import { ChildModule } from './child/child.module';
import { ChildFeeAssignmentModule } from './child-fee-assignment/child-fee-assignment.module';
import { ChildGuardianModule } from './child-guardian/child-guardian.module';
import { ClassroomModule } from './classroom/classroom.module';
// Aliased: this file's own class is also EnrollmentModule (the umbrella
// grouping module) - the entity module keeps the name matching its
// Classroom/Child siblings, so only this import needs disambiguating.
import { DiscountModule } from './discount/discount.module';
import { EnrollmentModule as EnrollmentRecordModule } from './enrollment/enrollment.module';
import { FeeModule } from './fee/fee.module';
import { GuardianModule } from './guardian/guardian.module';
import { HolidayModule } from './holiday/holiday.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PayrollModule } from './payroll/payroll.module';
import { PlanModule } from './plan/plan.module';
import { PlanFeeModule } from './plan-fee/plan-fee.module';
import { PlanPriceModule } from './plan-price/plan-price.module';
import { SiblingDiscountTierModule } from './sibling-discount-tier/sibling-discount-tier.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ClassroomModule,
    ChildModule,
    ChildFeeAssignmentModule,
    EnrollmentRecordModule,
    GuardianModule,
    ChildGuardianModule,
    StaffModule,
    PayrollModule,
    AttendanceModule,
    InvoiceModule,
    PlanModule,
    PlanPriceModule,
    FeeModule,
    PlanFeeModule,
    DiscountModule,
    SiblingDiscountTierModule,
    HolidayModule,
  ],
})
export class EnrollmentModule {}
