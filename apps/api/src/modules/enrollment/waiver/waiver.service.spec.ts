import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { BillingRunService } from '../billing-run/billing-run.service';
import { CreditNoteService } from '../credit-note/credit-note.service';
import { InvoiceService } from '../invoice/invoice.service';
import { ManualOverrideService } from '../manual-override/manual-override.service';
import { PricingEngineService } from '../pricing-engine/pricing-engine.service';
import { WaiverConflictError } from './waiver-conflict.error';
import { WaiverRepository } from './waiver.repository';
import { WaiverService } from './waiver.service';

const D = (value: number) => new Prisma.Decimal(value);

describe('WaiverService', () => {
  let repository: jest.Mocked<WaiverRepository>;
  let invoiceService: jest.Mocked<InvoiceService>;
  let billingRunService: jest.Mocked<BillingRunService>;
  let pricingEngineService: jest.Mocked<PricingEngineService>;
  let creditNoteService: jest.Mocked<CreditNoteService>;
  let manualOverrideService: jest.Mocked<ManualOverrideService>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: WaiverService;

  const billingRunPeriod = { periodStart: new Date('2026-09-01'), periodEnd: new Date('2026-09-30') };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findForChild: jest.fn(),
      findEffectiveForPeriod: jest.fn(),
      findOneComposable: jest.fn().mockResolvedValue({ id: 'waiver-1', reasonCode: 'HARDSHIP', reasonNote: null }),
      runInTransaction: jest.fn().mockImplementation((_tenantId, fn) => fn('tx' as never)),
    } as unknown as jest.Mocked<WaiverRepository>;

    invoiceService = {
      findOneComposable: jest.fn().mockResolvedValue({
        id: 'invoice-1',
        status: 'DRAFT',
        childId: 'child-1',
        billedToGuardianId: 'guardian-1',
        totalAmount: D(1000),
        billingRun: billingRunPeriod,
      }),
    } as unknown as jest.Mocked<InvoiceService>;

    billingRunService = {
      regenerateInvoiceForChild: jest.fn().mockResolvedValue({ id: 'invoice-1', totalAmount: D(700) }),
    } as unknown as jest.Mocked<BillingRunService>;

    pricingEngineService = {
      computeChargesForPeriod: jest.fn().mockResolvedValue({ billedToGuardianId: 'guardian-1', drafts: [] }),
    } as unknown as jest.Mocked<PricingEngineService>;

    creditNoteService = {
      createComposable: jest.fn().mockResolvedValue({ id: 'credit-note-1' }),
    } as unknown as jest.Mocked<CreditNoteService>;

    manualOverrideService = {
      record: jest.fn().mockResolvedValue({ id: 'override-1' }),
    } as unknown as jest.Mocked<ManualOverrideService>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new WaiverService(
      repository,
      invoiceService,
      billingRunService,
      pricingEngineService,
      creditNoteService,
      manualOverrideService,
      currentTenant,
      currentUser,
    );
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

  describe('remove', () => {
    it('passes the resolved tenant, id, and deletedBy to the repository', async () => {
      repository.softDelete.mockResolvedValue(undefined as never);
      await service.remove('waiver-1');
      expect(repository.softDelete).toHaveBeenCalledWith('tenant-1', 'waiver-1', 'user-1');
    });

    it('translates a missing Waiver into a 404', async () => {
      repository.softDelete.mockRejectedValue(new EntityNotFoundError('Waiver', 'waiver-1'));
      await expect(service.remove('waiver-1')).rejects.toThrow(NotFoundException);
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

  describe('applyRetroactively', () => {
    it('DRAFT invoice: regenerates in place via BillingRunService and records a ManualOverride (no CreditNote)', async () => {
      await service.applyRetroactively('waiver-1', 'invoice-1');

      expect(billingRunService.regenerateInvoiceForChild).toHaveBeenCalledWith(
        'tx',
        'tenant-1',
        'child-1',
        '2026-09-01',
        '2026-09-30',
        'user-1',
      );
      expect(creditNoteService.createComposable).not.toHaveBeenCalled();
      expect(manualOverrideService.record).toHaveBeenCalledWith(
        'tx',
        'tenant-1',
        expect.objectContaining({
          overrideType: 'WAIVER',
          reasonCode: 'HARDSHIP',
          relatedEntityType: 'Invoice',
          relatedEntityId: 'invoice-1',
        }),
        'user-1',
      );
    });

    it('ISSUED invoice: recomputes via PricingEngineService and credits the difference', async () => {
      invoiceService.findOneComposable.mockResolvedValue({
        id: 'invoice-1',
        status: 'ISSUED',
        childId: 'child-1',
        billedToGuardianId: 'guardian-1',
        totalAmount: D(1000),
        billingRun: billingRunPeriod,
      } as never);
      pricingEngineService.computeChargesForPeriod.mockResolvedValue({
        billedToGuardianId: 'guardian-1',
        drafts: [{ sourceType: 'PLAN_TUITION', description: 'x', quantity: '1', unitAmount: '850', totalAmount: '850' }],
      } as never);

      await service.applyRetroactively('waiver-1', 'invoice-1');

      expect(billingRunService.regenerateInvoiceForChild).not.toHaveBeenCalled();
      expect(pricingEngineService.computeChargesForPeriod).toHaveBeenCalledWith(
        'tenant-1',
        'child-1',
        '2026-09-01',
        '2026-09-30',
        'tx',
      );
      expect(creditNoteService.createComposable).toHaveBeenCalledWith(
        'tx',
        'tenant-1',
        { invoiceId: 'invoice-1', guardianId: 'guardian-1', amount: expect.anything(), reasonCode: 'RETROACTIVE_WAIVER' },
        'user-1',
      );
      expect(manualOverrideService.record).toHaveBeenCalledWith(
        'tx',
        'tenant-1',
        expect.objectContaining({ relatedEntityType: 'CreditNote', relatedEntityId: 'credit-note-1' }),
        'user-1',
      );
    });

    it('PARTIALLY_PAID/PAID invoices are treated the same as ISSUED ("anything issued")', async () => {
      invoiceService.findOneComposable.mockResolvedValue({
        id: 'invoice-1',
        status: 'PARTIALLY_PAID',
        childId: 'child-1',
        billedToGuardianId: 'guardian-1',
        totalAmount: D(1000),
        billingRun: billingRunPeriod,
      } as never);
      pricingEngineService.computeChargesForPeriod.mockResolvedValue({
        billedToGuardianId: 'guardian-1',
        drafts: [{ sourceType: 'PLAN_TUITION', description: 'x', quantity: '1', unitAmount: '900', totalAmount: '900' }],
      } as never);

      await service.applyRetroactively('waiver-1', 'invoice-1');

      expect(creditNoteService.createComposable).toHaveBeenCalled();
    });

    it('VOID invoice: throws - unresolved business-rule gap, no invented behavior', async () => {
      invoiceService.findOneComposable.mockResolvedValue({
        id: 'invoice-1',
        status: 'VOID',
        childId: 'child-1',
        billedToGuardianId: 'guardian-1',
        totalAmount: D(1000),
        billingRun: billingRunPeriod,
      } as never);

      await expect(service.applyRetroactively('waiver-1', 'invoice-1')).rejects.toThrow(/VOID/);
      expect(creditNoteService.createComposable).not.toHaveBeenCalled();
      expect(billingRunService.regenerateInvoiceForChild).not.toHaveBeenCalled();
    });

    it('a manually-created invoice with no BillingRun: throws - no period to recompute against', async () => {
      invoiceService.findOneComposable.mockResolvedValue({
        id: 'invoice-1',
        status: 'DRAFT',
        childId: 'child-1',
        billedToGuardianId: 'guardian-1',
        totalAmount: D(1000),
        billingRun: null,
      } as never);

      await expect(service.applyRetroactively('waiver-1', 'invoice-1')).rejects.toThrow(/no associated BillingRun/);
    });

    it('Waiver.reasonCode = OWNER_FAMILY has no ManualOverride equivalent: throws - no invented mapping', async () => {
      repository.findOneComposable.mockResolvedValue({ id: 'waiver-1', reasonCode: 'OWNER_FAMILY', reasonNote: null } as never);

      await expect(service.applyRetroactively('waiver-1', 'invoice-1')).rejects.toThrow(/no corresponding ManualOverride reasonCode/);
    });

    it('recomputed total not lower than the current total: throws - no invented skip/floor behavior', async () => {
      invoiceService.findOneComposable.mockResolvedValue({
        id: 'invoice-1',
        status: 'ISSUED',
        childId: 'child-1',
        billedToGuardianId: 'guardian-1',
        totalAmount: D(1000),
        billingRun: billingRunPeriod,
      } as never);
      pricingEngineService.computeChargesForPeriod.mockResolvedValue({
        billedToGuardianId: 'guardian-1',
        drafts: [{ sourceType: 'PLAN_TUITION', description: 'x', quantity: '1', unitAmount: '1000', totalAmount: '1000' }],
      } as never);

      await expect(service.applyRetroactively('waiver-1', 'invoice-1')).rejects.toThrow(/not lower than its current total/);
      expect(creditNoteService.createComposable).not.toHaveBeenCalled();
    });
  });
});
