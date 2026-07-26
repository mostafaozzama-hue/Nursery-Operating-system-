import { auth } from './endpoints/auth';
import { childGuardians } from './endpoints/child-guardians';
import { children } from './endpoints/children';
import { classrooms } from './endpoints/classrooms';
import { enrollments } from './endpoints/enrollments';
import { guardians } from './endpoints/guardians';
import { memberships } from './endpoints/memberships';
import { payroll } from './endpoints/payroll';
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
};
