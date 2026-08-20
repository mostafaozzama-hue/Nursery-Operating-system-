import { Module } from '@nestjs/common';
import { AdmissionModule } from './admission/admission.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BillingRunModule } from './billing-run/billing-run.module';
import { ChildModule } from './child/child.module';
import { ChildDiscountAssignmentModule } from './child-discount-assignment/child-discount-assignment.module';
import { ChildFeeAssignmentModule } from './child-fee-assignment/child-fee-assignment.module';
import { ChildGuardianModule } from './child-guardian/child-guardian.module';
import { ClassroomModule } from './classroom/classroom.module';
import { CreditNoteModule } from './credit-note/credit-note.module';
// Aliased: this file's own class is also EnrollmentModule (the umbrella
// grouping module) - the entity module keeps the name matching its
// Classroom/Child siblings, so only this import needs disambiguating.
import { DiscountModule } from './discount/discount.module';
import { EnrollmentModule as EnrollmentRecordModule } from './enrollment/enrollment.module';
import { FeeModule } from './fee/fee.module';
import { GuardianModule } from './guardian/guardian.module';
import { HolidayModule } from './holiday/holiday.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ManualOverrideModule } from './manual-override/manual-override.module';
import { OneTimeChargeModule } from './one-time-charge/one-time-charge.module';
import { PaymentModule } from './payment/payment.module';
import { PaymentAllocationModule } from './payment-allocation/payment-allocation.module';
import { PayrollModule } from './payroll/payroll.module';
import { PlanModule } from './plan/plan.module';
import { PlanFeeModule } from './plan-fee/plan-fee.module';
import { PlanPriceModule } from './plan-price/plan-price.module';
import { PricingEngineModule } from './pricing-engine/pricing-engine.module';
import { SiblingDiscountTierModule } from './sibling-discount-tier/sibling-discount-tier.module';
import { StaffModule } from './staff/staff.module';
import { WaiverModule } from './waiver/waiver.module';

@Module({
  imports: [
    AdmissionModule,
    ClassroomModule,
    ChildModule,
    ChildDiscountAssignmentModule,
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
    WaiverModule,
    PricingEngineModule,
    BillingRunModule,
    ManualOverrideModule,
    OneTimeChargeModule,
    CreditNoteModule,
    PaymentAllocationModule,
    PaymentModule,
  ],
})
export class EnrollmentModule {}
