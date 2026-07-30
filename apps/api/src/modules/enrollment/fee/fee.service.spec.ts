import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { FeeRepository } from './fee.repository';
import { FeeService } from './fee.service';

describe('FeeService', () => {
  let repository: jest.Mocked<FeeRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: FeeService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<FeeRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new FeeService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant, dto, and user to the repository', async () => {
      const dto = { name: 'Meals', type: 'RECURRING', amount: 500 } as never;
      repository.create.mockResolvedValue({ id: 'fee-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'fee-1' });
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'fee-1' }, { id: 'fee-2' }],
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
        data: [{ id: 'fee-1' }, { id: 'fee-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the fee when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'fee-1' } as never);
      await expect(service.findOne('fee-1')).resolves.toEqual({ id: 'fee-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Fee', 'fee-1'));
      await expect(service.findOne('fee-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneOrThrow', () => {
    it('passes tenantId, id, and an explicit tx through to the repository untranslated', async () => {
      const tx = {} as never;
      repository.findOneOrThrow.mockResolvedValue({ id: 'fee-1' } as never);

      const result = await service.findOneOrThrow('tenant-1', 'fee-1', tx);

      expect(repository.findOneOrThrow).toHaveBeenCalledWith('tenant-1', 'fee-1', tx);
      expect(result).toEqual({ id: 'fee-1' });
    });

    it('works without a tx (entry-point usage)', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'fee-1' } as never);

      await service.findOneOrThrow('tenant-1', 'fee-1');

      expect(repository.findOneOrThrow).toHaveBeenCalledWith('tenant-1', 'fee-1', undefined);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'fee-1', name: 'Transportation' } as never);

      const result = await service.update('fee-1', { name: 'Transportation' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'fee-1', { name: 'Transportation' }, 'user-1');
      expect(result).toEqual({ id: 'fee-1', name: 'Transportation' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Fee', 'fee-1'));
      await expect(service.update('fee-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('setActive', () => {
    it('passes tenant, id, isActive, and user to the repository', async () => {
      repository.setActive.mockResolvedValue({ id: 'fee-1', isActive: false } as never);

      const result = await service.setActive('fee-1', false);

      expect(repository.setActive).toHaveBeenCalledWith('tenant-1', 'fee-1', false, 'user-1');
      expect(result).toEqual({ id: 'fee-1', isActive: false });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.setActive.mockRejectedValue(new EntityNotFoundError('Fee', 'fee-1'));
      await expect(service.setActive('fee-1', true)).rejects.toThrow(NotFoundException);
    });
  });
});
