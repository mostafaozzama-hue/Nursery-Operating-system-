import type { Child } from '@nursery-os/contracts';

export function fullName(child: Pick<Child, 'firstName' | 'lastName'>): string {
  return `${child.firstName} ${child.lastName}`;
}

export function formatDateOfBirth(dateOfBirth: string): string {
  return new Date(dateOfBirth).toLocaleDateString();
}
