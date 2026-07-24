import type { CurrentUser, LoginRequest, RegisterRequest } from '@nursery-os/contracts';
import { get, post } from '../client';

export const auth = {
  register: (body: RegisterRequest) => post<CurrentUser>('/auth/register', body),
  login: (body: LoginRequest) => post<CurrentUser>('/auth/login', body),
  me: () => get<CurrentUser>('/auth/me'),
  logout: () => post<void>('/auth/logout'),
};
