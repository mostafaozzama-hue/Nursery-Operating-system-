import { Prisma } from '@nursery-os/database';

/** True for any unique/partial-unique index violation, not just @unique-annotated columns. */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
