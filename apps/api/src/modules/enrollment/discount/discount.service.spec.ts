import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { DiscountRepository } from './discount.repository';
import { DiscountService } from './discount.service';

describe('DiscountService', () => {
  let repository: jest.Mocked<DiscountRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: DiscountService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<DiscountRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new DiscountService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant, dto fields, and user to the repository', async () => {
      const dto = { name: 'Early Bird', type: 'PERCENTAGE', amount: 10, stackable: true, scope: 'ALL_CHARGES' } as never;
      repository.create.mockResolvedValue({ id: 'discount-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        'tenant-1',
        { name: 'Early Bird', type: 'PERCENTAGE', amount: 10, stackable: true, scope: 'ALL_CHARGES' },
        'user-1',
      );
      expect(result).toEqual({ id: 'discount-1' });
    });

    it('defaults stackable to false and scope to BASE_TUITION_ONLY when omitted', async () => {
      repository.create.mockResolvedValue({ id: 'discount-1' } as never);

      await service.create({ name: 'Staff Benefit', type: 'FIXED_AMOUNT', amount: 200 } as never);

      expect(repository.create).toHaveBeenCalledWith(
        'tenant-1',
        { name: 'Staff Benefit', type: 'FIXED_AMOUNT', amount: 200, stackable: false, scope: 'BASE_TUITION_ONLY' },
        'user-1',
      );
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'discount-1' }, { id: 'discount-2' }],
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
        data: [{ id: 'discount-1' }, { id: 'discount-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the discount when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'discount-1' } as never);
      await expect(service.findOne('discount-1')).resolves.toEqual({ id: 'discount-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Discount', 'discount-1'));
      await expect(service.findOne('discount-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'discount-1', name: 'Renamed' } as never);

      const result = await service.update('discount-1', { name: 'Renamed' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'discount-1', { name: 'Renamed' }, 'user-1');
      expect(result).toEqual({ id: 'discount-1', name: 'Renamed' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Discount', 'discount-1'));
      await expect(service.update('discount-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('setActive', () => {
    it('passes tenant, id, isActive, and user to the repository', async () => {
      repository.setActive.mockResolvedValue({ id: 'discount-1', isActive: false } as never);

      const result = await service.setActive('discount-1', false);

      expect(repository.setActive).toHaveBeenCalledWith('tenant-1', 'discount-1', false, 'user-1');
      expect(result).toEqual({ id: 'discount-1', isActive: false });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.setActive.mockRejectedValue(new EntityNotFoundError('Discount', 'discount-1'));
      await expect(service.setActive('discount-1', true)).rejects.toThrow(NotFoundException);
    });
  });
});
