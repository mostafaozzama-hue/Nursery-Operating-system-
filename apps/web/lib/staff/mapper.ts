/**
 * Staff has no name field of its own (backend design: identity comes from an
 * optionally-linked User, which itself only has an email, no name). Falls
 * back to position, then a neutral placeholder, when no email is resolvable -
 * either because userId is unset, or the viewer isn't authorized to read
 * memberships (STAFF role - see useMembershipDirectory).
 */
export function staffIdentityLabel(email: string | undefined, position: string | null): string {
  if (email) return email;
  if (position) return position;
  return 'Staff record';
}

export function formatHireDate(hireDate: string): string {
  return new Date(hireDate).toLocaleDateString();
}
