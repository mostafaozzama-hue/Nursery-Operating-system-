import type { Membership, MembershipQuery, Paginated } from '@nursery-os/contracts';
import { get } from '../client';

/** List-only - membership role/status management is a separate future feature, not part of Staff. */
export const memberships = {
  list: (query?: MembershipQuery) => get<Paginated<Membership>>('/memberships', query),
};
