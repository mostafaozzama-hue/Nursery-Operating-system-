import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildRepository } from './child.repository';
import { ChildService } from './child.service';

describe('ChildService', () => {
  let repository: jest.Mocked<ChildRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: ChildService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<ChildRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new ChildService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { firstName: 'Ava', lastName: 'Smith', dateOfBirth: '2022-03-15' };
      repository.create.mockResolvedValue({ id: 'child-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'child-1' });
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'child-1' }, { id: 'child-2' }],
        total: 2,
      } as never);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'child-1' }, { id: 'child-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the child when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'child-1' } as never);
      await expect(service.findOne('child-1')).resolves.toEqual({ id: 'child-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(service.findOne('child-1')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('child-1')).rejects.toThrow('Child child-1 not found');
    });

    it('propagates unrelated errors unchanged', async () => {
      repository.findOneOrThrow.mockRejectedValue(new Error('db down'));
      await expect(service.findOne('child-1')).rejects.toThrow('db down');
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'child-1', gender: 'female' } as never);

      const result = await service.update('child-1', { gender: 'female' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'child-1', { gender: 'female' }, 'user-1');
      expect(result).toEqual({ id: 'child-1', gender: 'female' });
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(service.update('child-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('passes tenant, id, and user to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('child-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'child-1', 'user-1');
    });

    it('translates not-found errors', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(service.remove('child-1')).rejects.toThrow(NotFoundException);
    });
  });
});
