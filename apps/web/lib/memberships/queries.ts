'use client';

import type { Membership } from '@nursery-os/contracts';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface MembershipDirectoryResult {
  memberships: Membership[];
  byId: Map<string, Membership>;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Bulk lookup source for resolving a Staff record's linked user into an email
 * (and, on Staff Detail, their membership status), and for the
 * MembershipPicker's selection list - same batched, bounded (pageSize: 100)
 * pattern as useGuardianDirectory/useChildDirectory/useClassroomDirectory.
 *
 * Deliberately unfiltered by status (not just `ACTIVE`): Staff Detail needs
 * to show a linked user's *actual* membership status honestly (e.g.
 * SUSPENDED), not hide it behind an empty lookup. MembershipPicker filters
 * to ACTIVE itself, client-side, since that's the only status
 * assertActiveMembership accepts for linking - same "picker excludes what
 * would 409/400" precedent as GuardianPicker/ChildPicker/ClassroomPicker.
 *
 * `GET /memberships` is OWNER/ADMIN-only on the backend (unlike every other
 * domain module, which lets STAFF read). Callers MUST gate use of this hook
 * behind `canManage` - calling it as STAFF will 403. Keyed by `userId`, not
 * `id`, since Staff.userId is what needs resolving.
 */
export function useMembershipDirectory(enabled: boolean): MembershipDirectoryResult {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setMemberships([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.memberships
      .list({ page: 1, pageSize: 100 })
      .then((result) => {
        if (!cancelled) setMemberships(result.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  const byId = useMemo(
    () => new Map(memberships.map((membership) => [membership.userId, membership])),
    [memberships],
  );

  return { memberships, byId, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
