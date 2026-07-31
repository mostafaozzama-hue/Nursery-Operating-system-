import { Prisma } from '@nursery-os/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChildDiscountAssignmentService } from '../child-discount-assignment/child-discount-assignment.service';
import { ChildFeeAssignmentService } from '../child-fee-assignment/child-fee-assignment.service';
import { EnrollmentBillingTermsService } from '../enrollment-billing-terms/enrollment-billing-terms.service';
import { PlanFeeService } from '../plan-fee/plan-fee.service';
import { PlanPriceService } from '../plan-price/plan-price.service';
import { SiblingDiscountTierService } from '../sibling-discount-tier/sibling-discount-tier.service';
import { PricingEngineService } from './pricing-engine.service';

const D = (value: number) => new Prisma.Decimal(value);

describe('PricingEngineService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let waiverFindMany: jest.Mock;
  let billingTerms: jest.Mocked<EnrollmentBillingTermsService>;
  let planPrice: jest.Mocked<PlanPriceService>;
  let planFee: jest.Mocked<PlanFeeService>;
  let childFeeAssignment: jest.Mocked<ChildFeeAssignmentService>;
  let childDiscountAssignment: jest.Mocked<ChildDiscountAssignmentService>;
  let siblingDiscountTier: jest.Mocked<SiblingDiscountTierService>;
  let service: PricingEngineService;

  const baseTerms = {
    id: 'terms-1',
    planId: 'plan-1',
    customRateAmount: null,
    billingGuardianId: 'guardian-1',
    plan: { name: 'Full Time' },
  };

  beforeEach(() => {
    billingTerms = {
      findEffectiveForChildAndPeriod: jest.fn().mockResolvedValue(baseTerms),
      countEligibleSiblings: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<EnrollmentBillingTermsService>;

    planPrice = {
      findEffective: jest.fn().mockResolvedValue({ id: 'price-1', amount: D(1000) }),
    } as unknown as jest.Mocked<PlanPriceService>;

    planFee = {
      findForPlanComposable: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PlanFeeService>;

    childFeeAssignment = {
      findEffectiveForPeriod: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ChildFeeAssignmentService>;

    childDiscountAssignment = {
      findEffectiveForPeriod: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ChildDiscountAssignmentService>;

    siblingDiscountTier = {
      findEffective: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SiblingDiscountTierService>;

    // PricingEngineService reads waivers directly (mirrors CapacityService's
    // precedent, not routed through WaiverService/WaiverModule - see
    // pricing-engine.service.ts's findEffectiveWaivers) - so this is a
    // PrismaService mock, not a WaiverService one. withTenantContext calls
    // prisma.$transaction, which this simulates by just invoking the
    // callback with a fake tx exposing the one query used.
    waiverFindMany = jest.fn().mockResolvedValue([]);
    prisma = {
      $transaction: jest.fn().mockImplementation((callback) =>
        callback({ waiver: { findMany: waiverFindMany }, $executeRaw: jest.fn() }),
      ),
    } as unknown as jest.Mocked<PrismaService>;

    service = new PricingEngineService(
      prisma,
      billingTerms,
      planPrice,
      planFee,
      childFeeAssignment,
      childDiscountAssignment,
      siblingDiscountTier,
    );
  });

  describe('tuition', () => {
    it('resolves via PlanPrice.findEffective when no customRateAmount is set', async () => {
      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      expect(planPrice.findEffective).toHaveBeenCalledWith('tenant-1', 'plan-1', '2026-09-01', undefined);
      expect(result.billedToGuardianId).toBe('guardian-1');
      expect(result.drafts).toEqual([
        expect.objectContaining({
          sourceType: 'PLAN_TUITION',
          description: 'Full Time',
          totalAmount: '1000',
          planPriceId: 'price-1',
        }),
      ]);
    });

    it('uses customRateAmount directly, skipping PlanPrice, when set', async () => {
      billingTerms.findEffectiveForChildAndPeriod.mockResolvedValue({ ...baseTerms, customRateAmount: D(750) } as never);

      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      expect(planPrice.findEffective).not.toHaveBeenCalled();
      expect(result.drafts).toEqual([
        expect.objectContaining({ sourceType: 'PLAN_TUITION', totalAmount: '750', planPriceId: undefined }),
      ]);
    });

    it('throws when no effective EnrollmentBillingTerms exists for the period', async () => {
      billingTerms.findEffectiveForChildAndPeriod.mockResolvedValue(null);

      await expect(
        service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30'),
      ).rejects.toThrow(/no effective EnrollmentBillingTerms/);
    });

    it('throws when billing terms have neither customRateAmount nor planId', async () => {
      billingTerms.findEffectiveForChildAndPeriod.mockResolvedValue({
        ...baseTerms,
        planId: null,
        customRateAmount: null,
      } as never);

      await expect(
        service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30'),
      ).rejects.toThrow(/neither customRateAmount nor planId/);
    });
  });

  describe('fees', () => {
    it('includes mandatory PlanFees at live Fee.amount and optional ChildFeeAssignments at snapshotAmount', async () => {
      planFee.findForPlanComposable.mockResolvedValue([
        { isMandatory: true, fee: { name: 'Meals', amount: D(50) } },
        { isMandatory: false, fee: { name: 'Transport', amount: D(999) } },
      ] as never);
      childFeeAssignment.findEffectiveForPeriod.mockResolvedValue([
        { snapshotAmount: D(80), fee: { name: 'Extra Activity' } },
      ] as never);

      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      const feeLines = result.drafts.filter((d) => d.sourceType === 'FEE');
      expect(feeLines).toEqual([
        expect.objectContaining({ description: 'Meals', totalAmount: '50' }),
        expect.objectContaining({ description: 'Extra Activity', totalAmount: '80' }),
      ]);
    });
  });

  describe('discounts', () => {
    it('sums all stackable discounts and keeps only the best exclusive one', async () => {
      childDiscountAssignment.findEffectiveForPeriod.mockResolvedValue([
        { snapshotAmount: D(10), discount: { name: 'Stackable A', type: 'PERCENTAGE', scope: 'BASE_TUITION_ONLY', stackable: true } },
        { snapshotAmount: D(5), discount: { name: 'Stackable B', type: 'PERCENTAGE', scope: 'BASE_TUITION_ONLY', stackable: true } },
        { snapshotAmount: D(200), discount: { name: 'Exclusive small', type: 'FIXED_AMOUNT', scope: 'BASE_TUITION_ONLY', stackable: false } },
        { snapshotAmount: D(300), discount: { name: 'Exclusive big', type: 'FIXED_AMOUNT', scope: 'BASE_TUITION_ONLY', stackable: false } },
      ] as never);

      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      const discountLines = result.drafts.filter((d) => d.sourceType === 'DISCOUNT');
      // tuition 1000: 10% = 100, 5% = 50, best exclusive = 300 (not 200)
      expect(discountLines).toEqual([
        expect.objectContaining({ description: 'Stackable A', totalAmount: '-100' }),
        expect.objectContaining({ description: 'Stackable B', totalAmount: '-50' }),
        expect.objectContaining({ description: 'Exclusive big', totalAmount: '-300' }),
      ]);
    });

    it('computes ALL_CHARGES scope against tuition plus fees, BASE_TUITION_ONLY against tuition alone', async () => {
      planFee.findForPlanComposable.mockResolvedValue([{ isMandatory: true, fee: { name: 'Meals', amount: D(200) } }] as never);
      childDiscountAssignment.findEffectiveForPeriod.mockResolvedValue([
        { snapshotAmount: D(10), discount: { name: 'All charges 10%', type: 'PERCENTAGE', scope: 'ALL_CHARGES', stackable: true } },
        { snapshotAmount: D(10), discount: { name: 'Tuition only 10%', type: 'PERCENTAGE', scope: 'BASE_TUITION_ONLY', stackable: true } },
      ] as never);

      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      const discountLines = result.drafts.filter((d) => d.sourceType === 'DISCOUNT');
      // tuition 1000 + fees 200 = 1200 base for ALL_CHARGES -> 120; tuition-only base 1000 -> 100
      expect(discountLines).toEqual([
        expect.objectContaining({ description: 'All charges 10%', totalAmount: '-120' }),
        expect.objectContaining({ description: 'Tuition only 10%', totalAmount: '-100' }),
      ]);
    });
  });

  describe('sibling discount tier', () => {
    it('produces no sibling line and does not throw when no tier threshold is met', async () => {
      billingTerms.countEligibleSiblings.mockResolvedValue(1);
      siblingDiscountTier.findEffective.mockResolvedValue([
        { siblingCountThreshold: 2, discountPercentage: D(10) },
      ] as never);

      await expect(
        service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30'),
      ).resolves.toBeDefined();
    });

    it('throws when a tier threshold is met, since no selection rule exists', async () => {
      billingTerms.countEligibleSiblings.mockResolvedValue(2);
      siblingDiscountTier.findEffective.mockResolvedValue([
        { siblingCountThreshold: 2, discountPercentage: D(10) },
      ] as never);

      await expect(
        service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30'),
      ).rejects.toThrow(/no rule determines which eligible child/);
    });
  });

  describe('waivers', () => {
    it('sums percentages across multiple waivers, capped at 100%, distributed proportionally', async () => {
      waiverFindMany.mockResolvedValue([
        { percentage: D(70), reasonCode: 'HARDSHIP' },
        { percentage: D(60), reasonCode: 'SCHOLARSHIP' },
      ]);

      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      const waiverLines = result.drafts.filter((d) => d.sourceType === 'WAIVER');
      // combined 130% capped at 100% of 1000 = 1000 total reduction, split 70:60
      expect(waiverLines).toEqual([
        expect.objectContaining({ description: 'Waiver (HARDSHIP)', totalAmount: '-538.46' }),
        expect.objectContaining({ description: 'Waiver (SCHOLARSHIP)', totalAmount: '-461.54' }),
      ]);
    });

    it('never drives the post-discount subtotal negative even with a large FIXED_AMOUNT discount overshoot', async () => {
      childDiscountAssignment.findEffectiveForPeriod.mockResolvedValue([
        { snapshotAmount: D(5000), discount: { name: 'Huge fixed', type: 'FIXED_AMOUNT', scope: 'BASE_TUITION_ONLY', stackable: true } },
      ] as never);
      waiverFindMany.mockResolvedValue([{ percentage: D(50), reasonCode: 'OTHER' }]);

      const result = await service.computeChargesForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30');

      const waiverLine = result.drafts.find((d) => d.sourceType === 'WAIVER');
      expect(waiverLine?.totalAmount).toBe('0');
    });
  });
});
