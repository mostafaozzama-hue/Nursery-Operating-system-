import { attendance } from './endpoints/attendance';
import { auth } from './endpoints/auth';
import { childGuardians } from './endpoints/child-guardians';
import { children } from './endpoints/children';
import { classrooms } from './endpoints/classrooms';
import { enrollments } from './endpoints/enrollments';
import { guardians } from './endpoints/guardians';
import { invoices } from './endpoints/invoices';
import { memberships } from './endpoints/memberships';
import { payments } from './endpoints/payments';
import { payroll } from './endpoints/payroll';
import { plans } from './endpoints/plans';
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
};
