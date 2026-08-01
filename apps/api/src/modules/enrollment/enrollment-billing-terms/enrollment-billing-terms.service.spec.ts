import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { EnrollmentBillingTermsConflictError } from './enrollment-billing-terms-conflict.error';
import { EnrollmentBillingTermsRepository } from './enrollment-billing-terms.repository';
import { EnrollmentBillingTermsService } from './enrollment-billing-terms.service';

describe('EnrollmentBillingTermsService', () => {
  let repository: jest.Mocked<EnrollmentBillingTermsRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: EnrollmentBillingTermsService;
  const fakeTx = {} as Prisma.TransactionClient;

  beforeEach(() => {
    repository = {
      openWithEnrollment: jest.fn(),
      closeWithEnrollment: jest.fn(),
      findCurrent: jest.fn(),
      findCurrentOrNull: jest.fn(),
      createInitial: jest.fn(),
      changeTerms: jest.fn(),
      findEffectiveForPeriod: jest.fn(),
      countEligibleSiblings: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentBillingTermsRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new EnrollmentBillingTermsService(repository, currentTenant, currentUser);
  });

  describe('openWithEnrollment', () => {
    it('passes the caller-supplied tx and tenantId straight through, defaulting validateReferences to true', async () => {
      const dto = { billingGuardianId: 'guardian-1' };
      repository.openWithEnrollment.mockResolvedValue({ id: 'terms-1' } as never);

      const result = await service.openWithEnrollment(fakeTx, 'tenant-x', 'enrollment-1', dto, 'user-x');

      expect(repository.openWithEnrollment).toHaveBeenCalledWith(fakeTx, 'tenant-x', 'enrollment-1', dto, 'user-x', true);
      expect(currentTenant.getTenantId).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'terms-1' });
    });

    it('passes validateReferences=false through for carry-forward callers', async () => {
      const dto = { billingGuardianId: 'guardian-1' };
      repository.openWithEnrollment.mockResolvedValue({ id: 'terms-1' } as never);

      await service.openWithEnrollment(fakeTx, 'tenant-x', 'enrollment-1', dto, 'user-x', false);

      expect(repository.openWithEnrollment).toHaveBeenCalledWith(
        fakeTx,
        'tenant-x',
        'enrollment-1',
        dto,
        'user-x',
        false,
      );
    });
  });

  describe('closeWithEnrollment', () => {
    it('passes through and returns null when the enrollment has no billing terms', async () => {
      repository.closeWithEnrollment.mockResolvedValue(null);
      const effectiveTo = new Date('2026-08-01');

      const result = await service.closeWithEnrollment(fakeTx, 'tenant-x', 'enrollment-1', effectiveTo, 'user-x');

      expect(repository.closeWithEnrollment).toHaveBeenCalledWith(fakeTx, 'tenant-x', 'enrollment-1', effectiveTo, 'user-x');
      expect(result).toBeNull();
    });
  });

  describe('findCurrent', () => {
    it('resolves the tenant and returns the terms when found', async () => {
      repository.findCurrent.mockResolvedValue({ id: 'terms-1' } as never);

      const result = await service.findCurrent('enrollment-1');

      expect(repository.findCurrent).toHaveBeenCalledWith('tenant-1', 'enrollment-1');
      expect(result).toEqual({ id: 'terms-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findCurrent.mockRejectedValue(new EntityNotFoundError('EnrollmentBillingTerms', 'enrollment-1'));
      await expect(service.findCurrent('enrollment-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeTerms - business-flow dispatch', () => {
    it('checks findCurrentOrNull first, before deciding which flow to run', async () => {
      repository.findCurrentOrNull.mockResolvedValue({ id: 'existing-terms' } as never);
      repository.changeTerms.mockResolvedValue({ id: 'terms-2' } as never);

      await service.changeTerms('enrollment-1', { effectiveFrom: '2026-09-01' } as never);

      expect(repository.findCurrentOrNull).toHaveBeenCalledWith('tenant-1', 'enrollment-1');
    });
  });

  describe('changeTerms - change existing billing terms (findCurrentOrNull resolves non-null)', () => {
    beforeEach(() => {
      repository.findCurrentOrNull.mockResolvedValue({ id: 'existing-terms' } as never);
    });

    it('passes the resolved tenant, dto, and user to the repository', async () => {
      const dto = { effectiveFrom: '2026-09-01' } as never;
      repository.changeTerms.mockResolvedValue({ id: 'terms-2' } as never);

      const result = await service.changeTerms('enrollment-1', dto);

      expect(repository.changeTerms).toHaveBeenCalledWith('tenant-1', 'enrollment-1', dto, 'user-1');
      expect(repository.createInitial).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'terms-2' });
    });

    it('translates a unique-constraint violation into a 409', async () => {
      repository.changeTerms.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(
        service.changeTerms('enrollment-1', { effectiveFrom: '2026-09-01' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates an EnrollmentBillingTermsConflictError into a 409', async () => {
      repository.changeTerms.mockRejectedValue(
        new EnrollmentBillingTermsConflictError('A standard billing-terms change must be dated in the future'),
      );
      await expect(
        service.changeTerms('enrollment-1', { effectiveFrom: '2026-09-01' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a not-found enrollment/guardian/plan into a 404', async () => {
      repository.changeTerms.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-x'));
      await expect(
        service.changeTerms('enrollment-1', { effectiveFrom: '2026-09-01' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeTerms - create initial billing terms (findCurrentOrNull resolves null)', () => {
    beforeEach(() => {
      repository.findCurrentOrNull.mockResolvedValue(null);
    });

    it('calls repository.createInitial, not repository.changeTerms, with the resolved tenant/enrollment/user', async () => {
      const dto = { effectiveFrom: '2026-09-01', billingGuardianId: 'guardian-1' } as never;
      repository.createInitial.mockResolvedValue({ id: 'terms-1' } as never);

      const result = await service.changeTerms('enrollment-1', dto);

      expect(repository.createInitial).toHaveBeenCalledWith('tenant-1', 'enrollment-1', dto, 'user-1');
      expect(repository.changeTerms).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'terms-1' });
    });

    it('throws BadRequestException when billingGuardianId is missing, without calling the repository', async () => {
      const dto = { effectiveFrom: '2026-09-01' } as never;

      await expect(service.changeTerms('enrollment-1', dto)).rejects.toThrow(BadRequestException);
      expect(repository.createInitial).not.toHaveBeenCalled();
    });

    it('translates an EnrollmentBillingTermsConflictError (e.g. enrollment already closed) into a 409', async () => {
      repository.createInitial.mockRejectedValue(new EnrollmentBillingTermsConflictError('Enrollment already closed'));
      const dto = { effectiveFrom: '2026-09-01', billingGuardianId: 'guardian-1' } as never;

      await expect(service.changeTerms('enrollment-1', dto)).rejects.toThrow(ConflictException);
    });

    it('translates a not-found guardian/plan into a 404', async () => {
      repository.createInitial.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-x'));
      const dto = { effectiveFrom: '2026-09-01', billingGuardianId: 'guardian-x' } as never;

      await expect(service.changeTerms('enrollment-1', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEffectiveForPeriod', () => {
    it('passes through with an explicit tenantId, never resolving via CurrentTenantProvider', async () => {
      repository.findEffectiveForPeriod.mockResolvedValue({ id: 'terms-1' } as never);

      const result = await service.findEffectiveForPeriod('tenant-x', 'enrollment-1', '2026-09-01', '2026-10-01');

      expect(repository.findEffectiveForPeriod).toHaveBeenCalledWith(
        'tenant-x',
        'enrollment-1',
        '2026-09-01',
        '2026-10-01',
        undefined,
      );
      expect(currentTenant.getTenantId).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'terms-1' });
    });
  });

  describe('countEligibleSiblings', () => {
    it('passes through with an explicit tenantId', async () => {
      repository.countEligibleSiblings.mockResolvedValue(2);

      const result = await service.countEligibleSiblings('tenant-x', 'guardian-1', '2026-09-01', '2026-10-01', fakeTx);

      expect(repository.countEligibleSiblings).toHaveBeenCalledWith(
        'tenant-x',
        'guardian-1',
        '2026-09-01',
        '2026-10-01',
        fakeTx,
      );
      expect(result).toBe(2);
    });
  });
});
