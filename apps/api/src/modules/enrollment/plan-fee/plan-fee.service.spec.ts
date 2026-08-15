import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PlanFeeConflictError } from './plan-fee-conflict.error';
import { PlanFeeRepository } from './plan-fee.repository';
import { PlanFeeService } from './plan-fee.service';

describe('PlanFeeService', () => {
  let repository: jest.Mocked<PlanFeeRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: PlanFeeService;

  beforeEach(() => {
    repository = {
      attach: jest.fn(),
      detach: jest.fn(),
      findForPlan: jest.fn(),
    } as unknown as jest.Mocked<PlanFeeRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new PlanFeeService(repository, currentTenant, currentUser);
  });

  describe('attach', () => {
    it('passes the resolved tenant, planId, feeId, isMandatory, and user to the repository', async () => {
      repository.attach.mockResolvedValue({ id: 'plan-fee-1' } as never);

      const result = await service.attach('plan-1', { feeId: 'fee-1', isMandatory: true });

      expect(repository.attach).toHaveBeenCalledWith(
        'tenant-1',
        'plan-1',
        { feeId: 'fee-1', isMandatory: true },
        'user-1',
      );
      expect(result).toEqual({ id: 'plan-fee-1' });
    });

    it('defaults isMandatory to false when omitted', async () => {
      repository.attach.mockResolvedValue({ id: 'plan-fee-1' } as never);

      await service.attach('plan-1', { feeId: 'fee-1' });

      expect(repository.attach).toHaveBeenCalledWith(
        'tenant-1',
        'plan-1',
        { feeId: 'fee-1', isMandatory: false },
        'user-1',
      );
    });

    it('translates a duplicate-pairing conflict into a 409', async () => {
      repository.attach.mockRejectedValue(new PlanFeeConflictError('This Fee is already attached to this Plan'));
      await expect(service.attach('plan-1', { feeId: 'fee-1' })).rejects.toThrow(ConflictException);
    });

    it('translates a missing Plan or Fee into a 404', async () => {
      repository.attach.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(service.attach('plan-1', { feeId: 'fee-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('detach', () => {
    it('passes tenant, planId, feeId, and user to the repository', async () => {
      repository.detach.mockResolvedValue(undefined as never);
      await service.detach('plan-1', 'fee-1');
      expect(repository.detach).toHaveBeenCalledWith('tenant-1', 'plan-1', 'fee-1', 'user-1');
    });

    it('translates a missing pairing into a 404', async () => {
      repository.detach.mockRejectedValue(new EntityNotFoundError('PlanFee', 'plan-1:fee-1'));
      await expect(service.detach('plan-1', 'fee-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findForPlan', () => {
    it('returns the attached fees for the plan', async () => {
      repository.findForPlan.mockResolvedValue([{ id: 'plan-fee-1' }] as never);
      await expect(service.findForPlan('plan-1')).resolves.toEqual([{ id: 'plan-fee-1' }]);
      expect(repository.findForPlan).toHaveBeenCalledWith('tenant-1', 'plan-1');
    });

    it('translates a missing Plan into a 404', async () => {
      repository.findForPlan.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(service.findForPlan('plan-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findForPlanComposable', () => {
    it('passes tenantId, planId, and an explicit tx through to the repository untranslated', async () => {
      const tx = {} as never;
      repository.findForPlan.mockResolvedValue([{ id: 'plan-fee-1' }] as never);

      const result = await service.findForPlanComposable('tenant-1', 'plan-1', tx);

      expect(repository.findForPlan).toHaveBeenCalledWith('tenant-1', 'plan-1', tx);
      expect(result).toEqual([{ id: 'plan-fee-1' }]);
    });

    it('works without a tx (entry-point-style usage)', async () => {
      repository.findForPlan.mockResolvedValue([] as never);
      await service.findForPlanComposable('tenant-1', 'plan-1');
      expect(repository.findForPlan).toHaveBeenCalledWith('tenant-1', 'plan-1', undefined);
    });
  });
});
