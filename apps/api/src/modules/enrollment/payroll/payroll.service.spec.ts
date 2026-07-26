import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PayrollConflictError } from './payroll-conflict.error';
import { PayrollRepository } from './payroll.repository';
import { PayrollService } from './payroll.service';

describe('PayrollService', () => {
  let repository: jest.Mocked<PayrollRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: PayrollService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<PayrollRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = {
      getUserId: jest.fn().mockReturnValue('user-1'),
    } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new PayrollService(repository, currentTenant, currentUser);
  });

  const dto = {
    staffId: 'staff-1',
    payType: 'SALARY' as const,
    payRate: 55000,
    payFrequency: 'MONTHLY' as const,
    currency: 'USD',
    effectiveDate: '2026-07-25',
  };

  describe('create', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      repository.create.mockResolvedValue({ id: 'payroll-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'payroll-1' });
    });

    it('translates a unique-constraint violation into a 409', async () => {
      repository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('translates a PayrollConflictError into a 409', async () => {
      repository.create.mockRejectedValue(new PayrollConflictError('already has payroll'));
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('translates a not-found staffId into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Staff', 'staff-1'));
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'payroll-1' }, { id: 'payroll-2' }],
        total: 2,
      } as never);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ page: 1 }),
      );
      expect(result).toEqual({
        data: [{ id: 'payroll-1' }, { id: 'payroll-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the payroll record when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'payroll-1' } as never);
      await expect(service.findOne('payroll-1')).resolves.toEqual({ id: 'payroll-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(
        new EntityNotFoundError('StaffPayroll', 'payroll-1'),
      );
      await expect(service.findOne('payroll-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'payroll-1', payRate: '60000' } as never);

      const result = await service.update('payroll-1', { payRate: 60000 });

      expect(repository.update).toHaveBeenCalledWith(
        'tenant-1',
        'payroll-1',
        { payRate: 60000 },
        'user-1',
      );
      expect(result).toEqual({ id: 'payroll-1', payRate: '60000' });
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('StaffPayroll', 'payroll-1'));
      await expect(service.update('payroll-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('passes tenant, id, and user to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('payroll-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'payroll-1', 'user-1');
    });

    it('translates not-found errors', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('StaffPayroll', 'payroll-1'));
      await expect(service.remove('payroll-1')).rejects.toThrow(NotFoundException);
    });
  });
});
