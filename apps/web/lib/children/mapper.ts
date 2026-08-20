import type { Child } from '@nursery-os/contracts';
import { env } from '@/env';

export function fullName(child: Pick<Child, 'firstName' | 'lastName'>): string {
  return `${child.firstName} ${child.lastName}`;
}

export function formatDateOfBirth(dateOfBirth: string): string {
  return new Date(dateOfBirth).toLocaleDateString();
}

/**
 * Easy Enrollment (Product Gap H, phase 2). photoUrl is either a legacy
 * externally-pasted absolute URL (rendered as-is, unchanged compatibility)
 * or the API's own stable "/children/{id}/photo" reference (Product Gap H's
 * local-disk upload), which needs the API origin prefixed - it's API-
 * relative, not web-app-relative. updatedAt is appended as a cache-buster so
 * a re-uploaded photo doesn't keep showing a stale cached image at the same
 * stable URL.
 */
export function resolvePhotoUrl(child: Pick<Child, 'photoUrl' | 'updatedAt'>): string | null {
  if (!child.photoUrl) return null;
  const isAbsolute = /^https?:\/\//.test(child.photoUrl);
  const base = isAbsolute ? child.photoUrl : `${env.NEXT_PUBLIC_API_URL}${child.photoUrl}`;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${encodeURIComponent(child.updatedAt)}`;
}
