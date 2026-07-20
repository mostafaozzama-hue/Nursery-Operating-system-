export class EntityNotFoundError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName} ${id} not found`);
  }
}
