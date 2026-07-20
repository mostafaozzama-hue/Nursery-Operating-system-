import { EntityNotFoundError } from '../errors/entity-not-found.error';
import { findOrThrow } from './find-or-throw';

describe('findOrThrow', () => {
  it('returns the result when the finder resolves a value', async () => {
    const result = await findOrThrow('Widget', 'id-1', async () => ({ id: 'id-1' }));
    expect(result).toEqual({ id: 'id-1' });
  });

  it('throws EntityNotFoundError with the entity name and id when the finder resolves null', async () => {
    await expect(findOrThrow('Widget', 'id-1', async () => null)).rejects.toThrow(EntityNotFoundError);
    await expect(findOrThrow('Widget', 'id-1', async () => null)).rejects.toThrow('Widget id-1 not found');
  });
});
