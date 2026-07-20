import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildGuardianConflictError } from './child-guardian-conflict.error';
import { ChildGuardianRepository } from './child-guardian.repository';
import { ChildGuardianService } from './child-guardian.service';

describe('ChildGuardianService', () => {
  let repository: jest.Mocked<ChildGuardianRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: ChildGuardianService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<ChildGuardianRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new ChildGuardianService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { childId: 'child-1', guardianId: 'guardian-1', relationshipType: 'MOTHER' as const };
      repository.create.mockResolvedValue({ id: 'link-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'link-1' });
    });

    it('translates a duplicate-pairing conflict into a 409', async () => {
      repository.create.mockRejectedValue(new ChildGuardianConflictError('This guardian is already linked to this child'));
      await expect(
        service.create({ childId: 'child-1', guardianId: 'guardian-1', relationshipType: 'MOTHER' as const }),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a primary-contact conflict into a 409', async () => {
      repository.create.mockRejectedValue(new ChildGuardianConflictError('Child already has a primary contact'));
      await expect(
        service.create({
          childId: 'child-1',
          guardianId: 'guardian-1',
          relationshipType: 'MOTHER' as const,
          isPrimaryContact: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a unique-constraint violation (race fallback) into a 409', async () => {
      repository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(
        service.create({ childId: 'child-1', guardianId: 'guardian-1', relationshipType: 'MOTHER' as const }),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a not-found child/guardian into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(
        service.create({ childId: 'child-1', guardianId: 'guardian-1', relationshipType: 'MOTHER' as const }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'link-1' }, { id: 'link-2' }],
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
        data: [{ id: 'link-1' }, { id: 'link-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the link when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'link-1' } as never);
      await expect(service.findOne('link-1')).resolves.toEqual({ id: 'link-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('ChildGuardian', 'link-1'));
      await expect(service.findOne('link-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'link-1', canPickup: true } as never);

      const result = await service.update('link-1', { canPickup: true });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'link-1', { canPickup: true }, 'user-1');
      expect(result).toEqual({ id: 'link-1', canPickup: true });
    });

    it('translates a primary-contact conflict into a 409', async () => {
      repository.update.mockRejectedValue(new ChildGuardianConflictError('Child already has a primary contact'));
      await expect(service.update('link-1', { isPrimaryContact: true })).rejects.toThrow(ConflictException);
    });

    it('translates not-found errors', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('ChildGuardian', 'link-1'));
      await expect(service.update('link-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('passes tenant, id, and user to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('link-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'link-1', 'user-1');
    });

    it('translates not-found errors', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('ChildGuardian', 'link-1'));
      await expect(service.remove('link-1')).rejects.toThrow(NotFoundException);
    });
  });
});
