import type { Guardian } from '@nursery-os/contracts';

export function fullName(guardian: Pick<Guardian, 'firstName' | 'lastName'>): string {
  return `${guardian.firstName} ${guardian.lastName}`;
}
