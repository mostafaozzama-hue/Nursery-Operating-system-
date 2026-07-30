import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { WaiverConflictError } from './waiver-conflict.error';
import { WaiverRepository } from './waiver.repository';
import { WaiverService } from './waiver.service';

describe('WaiverService', () => {
  let repository: jest.Mocked<WaiverRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: WaiverService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findForChild: jest.fn(),
      findEffectiveForPeriod: jest.fn(),
    } as unknown as jest.Mocked<WaiverRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new WaiverService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant, childId, dto, and approvedBy to the repository', async () => {
      const dto = {
        type: 'FULL',
        percentage: 100,
        reasonCode: 'OWNER_FAMILY',
        effectiveFrom: '2026-09-01',
        reviewAnnually: true,
      };
      repository.create.mockResolvedValue({ id: 'waiver-1' } as never);

      const result = await service.create('child-1', dto as never);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', 'child-1', dto, 'user-1');
      expect(result).toEqual({ id: 'waiver-1' });
    });

    it('translates a WaiverConflictError into a 409', async () => {
      repository.create.mockRejectedValue(new WaiverConflictError('reasonNote is required when reasonCode is OTHER'));
      await expect(
        service.create('child-1', { reasonCode: 'OTHER' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a missing Child into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(service.create('child-1', {} as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes the resolved tenant, id, dto, and updatedBy to the repository', async () => {
      const dto = { percentage: 50 };
      repository.update.mockResolvedValue({ id: 'waiver-1' } as never);

      const result = await service.update('waiver-1', dto as never);

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'waiver-1', dto, 'user-1');
      expect(result).toEqual({ id: 'waiver-1' });
    });

    it('translates a WaiverConflictError (merged-state violation) into a 409', async () => {
      repository.update.mockRejectedValue(
        new WaiverConflictError('effectiveTo must be set unless reviewAnnually is true'),
      );
      await expect(service.update('waiver-1', { reviewAnnually: false } as never)).rejects.toThrow(ConflictException);
    });

    it('translates a missing Waiver into a 404', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Waiver', 'waiver-1'));
      await expect(service.update('waiver-1', {} as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findForChild', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findForChild.mockResolvedValue({
        items: [{ id: 'waiver-1' }, { id: 'waiver-2' }],
        total: 2,
      } as never);

      const result = await service.findForChild('child-1', {
        page: 1,
        pageSize: 20,
        sortBy: 'effectiveFrom',
        sortOrder: 'desc',
      } as never);

      expect(repository.findForChild).toHaveBeenCalledWith('tenant-1', 'child-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'waiver-1' }, { id: 'waiver-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });

    it('translates a missing Child into a 404', async () => {
      repository.findForChild.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(
        service.findForChild('child-1', { page: 1, pageSize: 20, sortBy: 'effectiveFrom', sortOrder: 'desc' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEffectiveForPeriod', () => {
    it('passes through with an explicit tenantId, never resolving via CurrentTenantProvider', async () => {
      repository.findEffectiveForPeriod.mockResolvedValue([{ id: 'waiver-1' }] as never);

      const result = await service.findEffectiveForPeriod('tenant-x', 'child-1', '2026-09-01', '2026-09-30');

      expect(repository.findEffectiveForPeriod).toHaveBeenCalledWith(
        'tenant-x',
        'child-1',
        '2026-09-01',
        '2026-09-30',
        undefined,
      );
      expect(currentTenant.getTenantId).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'waiver-1' }]);
    });

    it('returns an empty array cleanly when no waivers are effective', async () => {
      repository.findEffectiveForPeriod.mockResolvedValue([] as never);
      await expect(
        service.findEffectiveForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30'),
      ).resolves.toEqual([]);
    });
  });
});
