import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from './entity-not-found.error';

/** Usable directly as a .catch() handler: `repo.method(...).catch(translateNotFound)`. */
export function translateNotFound(error: unknown): never {
  if (error instanceof EntityNotFoundError) {
    throw new NotFoundException(error.message);
  }
  throw error as Error;
}
