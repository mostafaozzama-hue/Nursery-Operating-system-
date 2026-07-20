import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from './entity-not-found.error';
import { translateNotFound } from './translate-not-found';

describe('translateNotFound', () => {
  it('translates EntityNotFoundError into a NotFoundException with the same message', () => {
    expect(() => translateNotFound(new EntityNotFoundError('Widget', 'id-1'))).toThrow(
      NotFoundException,
    );
    expect(() => translateNotFound(new EntityNotFoundError('Widget', 'id-1'))).toThrow(
      'Widget id-1 not found',
    );
  });

  it('rethrows any other error unchanged', () => {
    const original = new Error('connection lost');
    expect(() => translateNotFound(original)).toThrow(original);
  });
});
