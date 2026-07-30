import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { HolidayRepository } from './holiday.repository';
import { HolidayService } from './holiday.service';

describe('HolidayService', () => {
  let repository: jest.Mocked<HolidayRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: HolidayService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<HolidayRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new HolidayService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant, dto, and user to the repository', async () => {
      const dto = { date: '2026-04-10', name: 'Eid al-Fitr', type: 'FULL_CLOSURE' } as never;
      repository.create.mockResolvedValue({ id: 'holiday-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'holiday-1' });
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'holiday-1' }, { id: 'holiday-2' }],
        total: 2,
      } as never);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        sortBy: 'date',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'holiday-1' }, { id: 'holiday-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the holiday when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'holiday-1' } as never);
      await expect(service.findOne('holiday-1')).resolves.toEqual({ id: 'holiday-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Holiday', 'holiday-1'));
      await expect(service.findOne('holiday-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'holiday-1', name: 'Renamed' } as never);

      const result = await service.update('holiday-1', { name: 'Renamed' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'holiday-1', { name: 'Renamed' }, 'user-1');
      expect(result).toEqual({ id: 'holiday-1', name: 'Renamed' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Holiday', 'holiday-1'));
      await expect(service.update('holiday-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('passes tenant, id, and user to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('holiday-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'holiday-1', 'user-1');
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('Holiday', 'holiday-1'));
      await expect(service.remove('holiday-1')).rejects.toThrow(NotFoundException);
    });
  });
});
