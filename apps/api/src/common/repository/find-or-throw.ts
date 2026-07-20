import { EntityNotFoundError } from '../errors/entity-not-found.error';

/**
 * Repository delegates differ per Prisma model (tx.classroom vs tx.child),
 * so this stays a thin wrapper around a caller-supplied finder rather than a
 * full generic repository - that would fight Prisma's per-model typing for
 * little benefit with only two modules using it.
 */
export async function findOrThrow<T>(
  entityName: string,
  id: string,
  finder: () => Promise<T | null>,
): Promise<T> {
  const result = await finder();
  if (!result) {
    throw new EntityNotFoundError(entityName, id);
  }
  return result;
}
