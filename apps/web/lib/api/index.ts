import { auth } from './endpoints/auth';
import { childGuardians } from './endpoints/child-guardians';
import { children } from './endpoints/children';
import { classrooms } from './endpoints/classrooms';
import { guardians } from './endpoints/guardians';

export const api = { auth, classrooms, children, guardians, childGuardians };
