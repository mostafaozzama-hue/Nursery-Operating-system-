import type { RelationshipType } from '@nursery-os/contracts';

export function relationshipTypeLabel(type: RelationshipType): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
