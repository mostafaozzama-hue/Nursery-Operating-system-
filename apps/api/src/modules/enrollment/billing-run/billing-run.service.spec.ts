import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { EnrollmentBillingTermsRepository } from '../enrollment-billing-terms/enrollment-billing-terms.repository';
import { InvoiceService } from '../invoice/invoice.service';
import { PricingEngineService } from '../pricing-engine/pricing-engine.service';
import { BillingRunConflictError } from './billing-run-conflict.error';
import { BillingRunRepository } from './billing-run.repository';
import { BillingRunService } from './billing-run.service';

describe('BillingRunService', () => {
  let repository: jest.Mocked<BillingRunRepository>;
  let billingTerms: jest.Mocked<EnrollmentBillingTermsRepository>;
  let pricingEngine: jest.Mocked<PricingEngineService>;
  let invoice: jest.Mocked<InvoiceService>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: BillingRunService;

  const billingRun = { id: 'run-1', tenantId: 'tenant-1', status: 'COMPLETED' };

  beforeEach(() => {
    repository = {
      upsertForPeriod: jest.fn().mockResolvedValue(billingRun),
      findByPeriod: jest.fn().mockResolvedValue(billingRun),
      updateStatus: jest.fn().mockImplementation((_t, _id, status) => Promise.resolve({ ...billingRun, status })),
      runInTransaction: jest.fn().mockImplementation((_tenantId, fn) => fn('tx' as never)),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
    } as unknown as jest.Mocked<BillingRunRepository>;

    billingTerms = {
      findChildrenWithEffectiveTermsForPeriod: jest.fn().mockResolvedValue([{ childId: 'child-1' }]),
    } as unknown as jest.Mocked<EnrollmentBillingTermsRepository>;

    pricingEngine = {
      computeChargesForPeriod: jest.fn().mockResolvedValue({ billedToGuardianId: 'guardian-1', drafts: [] }),
    } as unknown as jest.Mocked<PricingEngineService>;

    invoice = {
      findAllForBillingRun: jest.fn().mockResolvedValue([]),
      findByBillingRunAndChild: jest.fn().mockResolvedValue(null),
      createComposable: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
      replaceGeneratedLines: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
    } as unknown as jest.Mocked<InvoiceService>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new BillingRunService(repository, billingTerms, pricingEngine, invoice, currentTenant, currentUser);
  });

  describe('generateForPeriod', () => {
    it('upserts the BillingRun row, regenerates each eligible child, and marks COMPLETED when all succeed', async () => {
      const result = await service.generateForPeriod({ periodStart: '2026-09-01', periodEnd: '2026-09-30' });

      expect(repository.upsertForPeriod).toHaveBeenCalledWith('tenant-1', '2026-09-01', '2026-09-30', 'user-1');
      expect(billingTerms.findChildrenWithEffectiveTermsForPeriod).toHaveBeenCalledWith(
        'tenant-1',
        '2026-09-01',
        '2026-09-30',
      );
      expect(invoice.createComposable).toHaveBeenCalledWith(
        'tx',
        'tenant-1',
        { childId: 'child-1', billedToGuardianId: 'guardian-1', billingRunId: 'run-1' },
        'user-1',
      );
      expect(repository.updateStatus).toHaveBeenCalledWith('tenant-1', 'run-1', 'COMPLETED', 'user-1');
      expect(result.status).toBe('COMPLETED');
    });

    it('re-running is idempotent: uses replaceGeneratedLines when an invoice already exists for the child', async () => {
      invoice.findByBillingRunAndChild.mockResolvedValue({ id: 'existing-invoice' } as never);

      await service.generateForPeriod({ periodStart: '2026-09-01', periodEnd: '2026-09-30' });

      expect(invoice.createComposable).not.toHaveBeenCalled();
      expect(invoice.replaceGeneratedLines).toHaveBeenCalledWith('tx', 'tenant-1', 'existing-invoice', [], 'user-1');
    });

    it('marks PARTIAL_FAILURE when one eligible child fails, without stopping the others', async () => {
      billingTerms.findChildrenWithEffectiveTermsForPeriod.mockResolvedValue([
        { childId: 'child-1' },
        { childId: 'child-2' },
      ] as never);
      pricingEngine.computeChargesForPeriod
        .mockRejectedValueOnce(new Error('no effective EnrollmentBillingTerms'))
        .mockResolvedValueOnce({ billedToGuardianId: 'guardian-1', drafts: [] });

      const result = await service.generateForPeriod({ periodStart: '2026-09-01', periodEnd: '2026-09-30' });

      expect(pricingEngine.computeChargesForPeriod).toHaveBeenCalledTimes(2);
      expect(repository.updateStatus).toHaveBeenCalledWith('tenant-1', 'run-1', 'PARTIAL_FAILURE', 'user-1');
      expect(result.status).toBe('PARTIAL_FAILURE');
    });

    it('throws a 409 when the run already has invoices and none are still DRAFT', async () => {
      invoice.findAllForBillingRun.mockResolvedValue([{ status: 'ISSUED' }, { status: 'PAID' }] as never);

      await expect(
        service.generateForPeriod({ periodStart: '2026-09-01', periodEnd: '2026-09-30' }),
      ).rejects.toThrow(ConflictException);
    });

    it('does not throw when at least one invoice under the run is still DRAFT', async () => {
      invoice.findAllForBillingRun.mockResolvedValue([{ status: 'ISSUED' }, { status: 'DRAFT' }] as never);

      await expect(
        service.generateForPeriod({ periodStart: '2026-09-01', periodEnd: '2026-09-30' }),
      ).resolves.toBeDefined();
    });

    it('does not throw when no invoices exist yet for the run (first-ever generation)', async () => {
      invoice.findAllForBillingRun.mockResolvedValue([]);

      await expect(
        service.generateForPeriod({ periodStart: '2026-09-01', periodEnd: '2026-09-30' }),
      ).resolves.toBeDefined();
    });
  });

  describe('regenerateInvoiceForChild', () => {
    it('throws EntityNotFoundError when no BillingRun exists for the period (a data-integrity expectation, not a business-rule gap)', async () => {
      repository.findByPeriod.mockResolvedValue(null);

      await expect(
        service.regenerateInvoiceForChild('tx' as never, 'tenant-1', 'child-1', '2026-09-01', '2026-09-30', 'user-1'),
      ).rejects.toThrow(/BillingRun.*not found/);
    });
  });

  describe('findHistory / findOne', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({ items: [billingRun], total: 1 } as never);

      const result = await service.findHistory({ page: 1, pageSize: 20, sortBy: 'runAt', sortOrder: 'desc' } as never);

      expect(result).toEqual({ data: [billingRun], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } });
    });

    it('translates a missing BillingRun into a 404', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('BillingRun', 'run-1'));
      await expect(service.findOne('run-1')).rejects.toThrow(NotFoundException);
    });
  });
});
