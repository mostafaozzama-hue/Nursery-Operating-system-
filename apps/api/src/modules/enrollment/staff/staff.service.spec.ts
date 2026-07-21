import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { InactiveMembershipError } from '../../../common/errors/inactive-membership.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { StaffConflictError } from './staff-conflict.error';
import { StaffRepository } from './staff.repository';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  let repository: jest.Mocked<StaffRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: StaffService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<StaffRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new StaffService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { position: 'Teacher' };
      repository.create.mockResolvedValue({ id: 'staff-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'staff-1' });
    });

    it('translates a unique-constraint violation into a 409', async () => {
      repository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(service.create({ position: 'Teacher' })).rejects.toThrow(ConflictException);
    });

    it('translates an InactiveMembershipError into a 400', async () => {
      repository.create.mockRejectedValue(new InactiveMembershipError('no active membership'));
      await expect(service.create({ position: 'Teacher' })).rejects.toThrow(BadRequestException);
    });

    it('translates a StaffConflictError into a 409', async () => {
      repository.create.mockRejectedValue(new StaffConflictError('already linked'));
      await expect(service.create({ position: 'Teacher' })).rejects.toThrow(ConflictException);
    });

    it('translates a not-found userId/classroomId into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Classroom', 'room-x'));
      await expect(service.create({ position: 'Teacher', classroomId: 'room-x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'staff-1' }, { id: 'staff-2' }],
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
        data: [{ id: 'staff-1' }, { id: 'staff-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the staff record when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'staff-1' } as never);
      await expect(service.findOne('staff-1')).resolves.toEqual({ id: 'staff-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Staff', 'staff-1'));
      await expect(service.findOne('staff-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'staff-1', position: 'Assistant' } as never);

      const result = await service.update('staff-1', { position: 'Assistant' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'staff-1', { position: 'Assistant' }, 'user-1');
      expect(result).toEqual({ id: 'staff-1', position: 'Assistant' });
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Staff', 'staff-1'));
      await expect(service.update('staff-1', {})).rejects.toThrow(NotFoundException);
    });

    it('translates an InactiveMembershipError into a 400', async () => {
      repository.update.mockRejectedValue(new InactiveMembershipError('no active membership'));
      await expect(service.update('staff-1', { userId: 'user-x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('passes tenant, id, and user to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('staff-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'staff-1', 'user-1');
    });

    it('translates not-found errors', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('Staff', 'staff-1'));
      await expect(service.remove('staff-1')).rejects.toThrow(NotFoundException);
    });
  });
});
