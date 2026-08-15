import type { EnrollmentStatus } from '@nursery-os/contracts';

export function enrollmentStatusLabel(status: EnrollmentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatEnrollmentDate(date: string): string {
  return new Date(date).toLocaleDateString();
}
