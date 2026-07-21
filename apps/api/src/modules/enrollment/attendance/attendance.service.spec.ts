import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { AttendanceConflictError } from './attendance-conflict.error';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let repository: jest.Mocked<AttendanceRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: AttendanceService;

  beforeEach(() => {
    repository = {
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      markAbsent: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<AttendanceRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new AttendanceService(repository, currentTenant, currentUser);
  });

  describe('checkIn', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { childId: 'child-1' };
      repository.checkIn.mockResolvedValue({ id: 'att-1' } as never);

      const result = await service.checkIn(dto);

      expect(repository.checkIn).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'att-1' });
    });

    it('translates a unique-constraint violation into a 409', async () => {
      repository.checkIn.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(service.checkIn({ childId: 'child-1' })).rejects.toThrow(ConflictException);
    });

    it('translates an AttendanceConflictError into a 409', async () => {
      repository.checkIn.mockRejectedValue(new AttendanceConflictError('already has a record for today'));
      await expect(service.checkIn({ childId: 'child-1' })).rejects.toThrow(ConflictException);
    });

    it('translates a not-found child/classroom into a 404', async () => {
      repository.checkIn.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(service.checkIn({ childId: 'child-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkOut', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.checkOut.mockResolvedValue({ id: 'att-1', status: 'CHECKED_OUT' } as never);

      const result = await service.checkOut('att-1', {});

      expect(repository.checkOut).toHaveBeenCalledWith('tenant-1', 'att-1', {}, 'user-1');
      expect(result).toEqual({ id: 'att-1', status: 'CHECKED_OUT' });
    });

    it('translates an already-checked-out conflict into a 409', async () => {
      repository.checkOut.mockRejectedValue(new AttendanceConflictError('already checked out'));
      await expect(service.checkOut('att-1', {})).rejects.toThrow(ConflictException);
    });

    it('translates a no-check-in (absence) conflict into a 409', async () => {
      repository.checkOut.mockRejectedValue(new AttendanceConflictError('no check-in'));
      await expect(service.checkOut('att-1', {})).rejects.toThrow(ConflictException);
    });

    it('translates not-found into a 404', async () => {
      repository.checkOut.mockRejectedValue(new EntityNotFoundError('Attendance', 'att-1'));
      await expect(service.checkOut('att-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAbsent', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      repository.markAbsent.mockResolvedValue({ id: 'att-1', status: 'ABSENT' } as never);
      const result = await service.markAbsent({ childId: 'child-1' });
      expect(repository.markAbsent).toHaveBeenCalledWith('tenant-1', { childId: 'child-1' }, 'user-1');
      expect(result).toEqual({ id: 'att-1', status: 'ABSENT' });
    });

    it('translates a duplicate-day conflict into a 409', async () => {
      repository.markAbsent.mockRejectedValue(new AttendanceConflictError('already has a record for today'));
      await expect(service.markAbsent({ childId: 'child-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'att-1' }, { id: 'att-2' }],
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
        data: [{ id: 'att-1' }, { id: 'att-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the record when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'att-1' } as never);
      await expect(service.findOne('att-1')).resolves.toEqual({ id: 'att-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Attendance', 'att-1'));
      await expect(service.findOne('att-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'att-1', classroomId: 'room-2' } as never);

      const result = await service.update('att-1', { classroomId: 'room-2' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'att-1', { classroomId: 'room-2' }, 'user-1');
      expect(result).toEqual({ id: 'att-1', classroomId: 'room-2' });
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Attendance', 'att-1'));
      await expect(service.update('att-1', {})).rejects.toThrow(NotFoundException);
    });
  });
});
