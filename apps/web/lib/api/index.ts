import { attendance } from './endpoints/attendance';
import { auth } from './endpoints/auth';
import { childGuardians } from './endpoints/child-guardians';
import { children } from './endpoints/children';
import { classrooms } from './endpoints/classrooms';
import { discounts } from './endpoints/discounts';
import { enrollmentBillingTerms } from './endpoints/enrollment-billing-terms';
import { enrollments } from './endpoints/enrollments';
import { fees } from './endpoints/fees';
import { guardians } from './endpoints/guardians';
import { invoices } from './endpoints/invoices';
import { memberships } from './endpoints/memberships';
import { payments } from './endpoints/payments';
import { payroll } from './endpoints/payroll';
import { planFees } from './endpoints/plan-fees';
import { planPrices } from './endpoints/plan-prices';
import { plans } from './endpoints/plans';
import { siblingDiscountTiers } from './endpoints/sibling-discount-tiers';
import { staff } from './endpoints/staff';

export const api = {
  auth,
  classrooms,
  children,
  guardians,
  childGuardians,
  enrollments,
  staff,
  memberships,
  payroll,
  attendance,
  invoices,
  payments,
  plans,
  planPrices,
  planFees,
  fees,
  discounts,
  enrollmentBillingTerms,
  siblingDiscountTiers,
};
