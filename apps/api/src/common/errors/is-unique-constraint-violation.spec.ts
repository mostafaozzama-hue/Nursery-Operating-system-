import { Prisma } from '@nursery-os/database';
import { isUniqueConstraintViolation } from './is-unique-constraint-violation';

describe('isUniqueConstraintViolation', () => {
  it('returns true for a Prisma P2002 error', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
    });
    expect(isUniqueConstraintViolation(error)).toBe(true);
  });

  it('returns false for a different Prisma error code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '5.22.0',
    });
    expect(isUniqueConstraintViolation(error)).toBe(false);
  });

  it('returns false for a non-Prisma error', () => {
    expect(isUniqueConstraintViolation(new Error('db down'))).toBe(false);
  });
});
