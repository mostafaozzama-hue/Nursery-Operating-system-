import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { EnrollmentConflictError } from './enrollment-conflict.error';
import { EnrollmentRepository } from './enrollment.repository';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  let repository: jest.Mocked<EnrollmentRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: EnrollmentService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      transfer: jest.fn(),
      withdraw: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new EnrollmentService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { childId: 'child-1', classroomId: 'room-1' };
      repository.create.mockResolvedValue({ id: 'enrollment-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'enrollment-1' });
    });

    it('translates a unique-constraint violation into a 409 (child already has an active enrollment)', async () => {
      repository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.create({ childId: 'child-1' })).rejects.toThrow(ConflictException);
      await expect(service.create({ childId: 'child-1' })).rejects.toThrow(
        'Child already has an active enrollment',
      );
    });

    it('translates a capacity conflict into a 409', async () => {
      repository.create.mockRejectedValue(new EnrollmentConflictError('Classroom room-1 has reached capacity'));
      await expect(service.create({ childId: 'child-1', classroomId: 'room-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('translates a not-found child/classroom into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Classroom', 'room-1'));
      await expect(service.create({ childId: 'child-1', classroomId: 'room-1' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'enrollment-1' }, { id: 'enrollment-2' }],
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
        data: [{ id: 'enrollment-1' }, { id: 'enrollment-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the enrollment when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'enrollment-1' } as never);
      await expect(service.findOne('enrollment-1')).resolves.toEqual({ id: 'enrollment-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Enrollment', 'enrollment-1'));
      await expect(service.findOne('enrollment-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'enrollment-1', createdReason: 'fixed typo' } as never);

      const result = await service.update('enrollment-1', { createdReason: 'fixed typo' });

      expect(repository.update).toHaveBeenCalledWith(
        'tenant-1',
        'enrollment-1',
        { createdReason: 'fixed typo' },
        'user-1',
      );
      expect(result).toEqual({ id: 'enrollment-1', createdReason: 'fixed typo' });
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Enrollment', 'enrollment-1'));
      await expect(service.update('enrollment-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('transfer', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      const dto = { newClassroomId: 'room-2' };
      repository.transfer.mockResolvedValue({ id: 'enrollment-2', classroomId: 'room-2' } as never);

      const result = await service.transfer('enrollment-1', dto);

      expect(repository.transfer).toHaveBeenCalledWith('tenant-1', 'enrollment-1', dto, 'user-1');
      expect(result).toEqual({ id: 'enrollment-2', classroomId: 'room-2' });
    });

    it('translates a same-classroom conflict into a 409', async () => {
      repository.transfer.mockRejectedValue(new EnrollmentConflictError('Already assigned to this classroom'));
      await expect(service.transfer('enrollment-1', { newClassroomId: 'room-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('translates an already-closed conflict (concurrency guard) into a 409', async () => {
      repository.transfer.mockRejectedValue(new EnrollmentConflictError('Enrollment already closed'));
      await expect(service.transfer('enrollment-1', { newClassroomId: 'room-2' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('translates not-found into a 404', async () => {
      repository.transfer.mockRejectedValue(new EntityNotFoundError('Enrollment', 'enrollment-1'));
      await expect(service.transfer('enrollment-1', { newClassroomId: 'room-2' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('withdraw', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      const dto = { reason: 'Moved away' };
      repository.withdraw.mockResolvedValue({ id: 'enrollment-1', status: 'WITHDRAWN' } as never);

      const result = await service.withdraw('enrollment-1', dto);

      expect(repository.withdraw).toHaveBeenCalledWith('tenant-1', 'enrollment-1', dto, 'user-1');
      expect(result).toEqual({ id: 'enrollment-1', status: 'WITHDRAWN' });
    });

    it('translates an already-closed conflict (concurrency guard) into a 409', async () => {
      repository.withdraw.mockRejectedValue(new EnrollmentConflictError('Enrollment already closed'));
      await expect(service.withdraw('enrollment-1', {})).rejects.toThrow(ConflictException);
    });

    it('translates not-found into a 404', async () => {
      repository.withdraw.mockRejectedValue(new EntityNotFoundError('Enrollment', 'enrollment-1'));
      await expect(service.withdraw('enrollment-1', {})).rejects.toThrow(NotFoundException);
    });
  });
});
