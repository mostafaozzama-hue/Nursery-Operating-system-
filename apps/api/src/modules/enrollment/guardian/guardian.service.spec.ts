import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { InactiveMembershipError } from '../../../common/errors/inactive-membership.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { GuardianConflictError } from './guardian-conflict.error';
import { GuardianRepository } from './guardian.repository';
import { GuardianService } from './guardian.service';

describe('GuardianService', () => {
  let repository: jest.Mocked<GuardianRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: GuardianService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<GuardianRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new GuardianService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('rejects when neither phone nor email is provided', async () => {
      await expect(service.create({ firstName: 'Jordan', lastName: 'Rivera' })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100' };
      repository.create.mockResolvedValue({ id: 'guardian-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'guardian-1' });
    });

    it('translates a unique-constraint violation into a 409', async () => {
      repository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(
        service.create({ firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100' }),
      ).rejects.toThrow(ConflictException);
    });

    it('translates an InactiveMembershipError into a 400', async () => {
      repository.create.mockRejectedValue(new InactiveMembershipError('no active membership'));
      await expect(
        service.create({ firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('translates a GuardianConflictError into a 409', async () => {
      repository.create.mockRejectedValue(new GuardianConflictError('already linked'));
      await expect(
        service.create({ firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100' }),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a not-found userId into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('User', 'user-x'));
      await expect(
        service.create({ firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100', userId: 'user-x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
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
        data: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the guardian when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'guardian-1' } as never);
      await expect(service.findOne('guardian-1')).resolves.toEqual({ id: 'guardian-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-1'));
      await expect(service.findOne('guardian-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'guardian-1', phone: '555-0199' } as never);

      const result = await service.update('guardian-1', { phone: '555-0199' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'guardian-1', { phone: '555-0199' }, 'user-1');
      expect(result).toEqual({ id: 'guardian-1', phone: '555-0199' });
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-1'));
      await expect(service.update('guardian-1', {})).rejects.toThrow(NotFoundException);
    });

    it('translates an InactiveMembershipError into a 400', async () => {
      repository.update.mockRejectedValue(new InactiveMembershipError('no active membership'));
      await expect(service.update('guardian-1', { userId: 'user-x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('passes tenant, id, and user to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('guardian-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'guardian-1', 'user-1');
    });

    it('translates not-found errors', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-1'));
      await expect(service.remove('guardian-1')).rejects.toThrow(NotFoundException);
    });
  });
});
