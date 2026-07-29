import {
  appRolePrisma,
  createTestTenant,
  superuserPrisma,
  withTenantScope,
} from './utils/test-db';

/**
 * Schema-level verification for the Configuration Engine extension
 * (docs/architecture/domain-model.md). No HTTP API exists yet for these
 * entities - backend services come after this foundation work - so these
 * tests exercise Prisma/Postgres directly: RLS isolation, the partial
 * unique indexes and CHECK constraints that live in raw-SQL migrations
 * (not expressible in Prisma DSL), and the Enrollment<->EnrollmentBillingTerms
 * and Payment<->Invoice/PaymentAllocation relationship changes.
 */
describe('Configuration Engine schema (e2e, direct Prisma)', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tenantMainId: string;
  let childId: string;
  let guardianId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    const [tenantA, tenantB, tenantMain] = await Promise.all([
      createTestTenant(`E2E Config Engine Tenant A ${Date.now()}`),
      createTestTenant(`E2E Config Engine Tenant B ${Date.now()}`),
      createTestTenant(`E2E Config Engine Tenant Main ${Date.now()}`),
    ]);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;
    tenantMainId = tenantMain.id;

    const child = await superuserPrisma.child.create({
      data: {
        tenantId: tenantMainId,
        firstName: 'Test',
        lastName: 'Child',
        dateOfBirth: new Date('2022-01-01'),
      },
    });
    childId = child.id;

    const guardian = await superuserPrisma.guardian.create({
      data: { tenantId: tenantMainId, firstName: 'Test', lastName: 'Guardian' },
    });
    guardianId = guardian.id;

    const enrollment = await superuserPrisma.enrollment.create({
      data: {
        tenantId: tenantMainId,
        childId,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      },
    });
    enrollmentId = enrollment.id;
  });

  afterAll(async () => {
    // FK-safe order: leaves before the roots they RESTRICT-reference.
    for (const tenantId of [tenantAId, tenantBId, tenantMainId]) {
      await superuserPrisma.manualOverride.deleteMany({ where: { tenantId } });
      await superuserPrisma.creditNote.deleteMany({ where: { tenantId } });
      await superuserPrisma.paymentAllocation.deleteMany({ where: { tenantId } });
      await superuserPrisma.payment.deleteMany({ where: { tenantId } });
      await superuserPrisma.invoice.deleteMany({ where: { tenantId } });
      await superuserPrisma.waiver.deleteMany({ where: { tenantId } });
      await superuserPrisma.enrollmentBillingTerms.deleteMany({ where: { tenantId } });
      await superuserPrisma.planPrice.deleteMany({ where: { tenantId } });
      await superuserPrisma.siblingDiscountTier.deleteMany({ where: { tenantId } });
      await superuserPrisma.plan.deleteMany({ where: { tenantId } });
      await superuserPrisma.fee.deleteMany({ where: { tenantId } });
      await superuserPrisma.enrollment.deleteMany({ where: { tenantId } });
      await superuserPrisma.child.deleteMany({ where: { tenantId } });
      await superuserPrisma.guardian.deleteMany({ where: { tenantId } });
    }
    await superuserPrisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId, tenantMainId] } },
    });
    await appRolePrisma.$disconnect();
    await superuserPrisma.$disconnect();
  });

  describe('RLS tenant isolation', () => {
    it('a Plan created under tenant A is invisible to tenant B', async () => {
      const plan = await withTenantScope(tenantAId, (tx) =>
        tx.plan.create({
          data: { tenantId: tenantAId, name: 'RLS Test Plan', billingCycle: 'MONTHLY', scheduleDaysOfWeek: ['MON'] },
        }),
      );

      const visibleToA = await withTenantScope(tenantAId, (tx) => tx.plan.findUnique({ where: { id: plan.id } }));
      expect(visibleToA).not.toBeNull();

      const visibleToB = await withTenantScope(tenantBId, (tx) => tx.plan.findUnique({ where: { id: plan.id } }));
      expect(visibleToB).toBeNull();

      const listAsB = await withTenantScope(tenantBId, (tx) => tx.plan.findMany());
      expect(listAsB.map((p) => p.id)).not.toContain(plan.id);
    });

    it('a ManualOverride created under tenant A is invisible to tenant B', async () => {
      const override = await withTenantScope(tenantAId, (tx) =>
        tx.manualOverride.create({
          data: {
            tenantId: tenantAId,
            overrideType: 'ONE_TIME_CHARGE',
            reasonCode: 'GOODWILL',
            relatedEntityType: 'Invoice',
            relatedEntityId: '00000000-0000-0000-0000-000000000000',
            newValue: '50.00',
            appliedBy: '00000000-0000-0000-0000-000000000000',
            appliedAt: new Date(),
          },
        }),
      );

      const visibleToB = await withTenantScope(tenantBId, (tx) =>
        tx.manualOverride.findUnique({ where: { id: override.id } }),
      );
      expect(visibleToB).toBeNull();
    });

    it('without app.tenant_id set, no rows are visible (fail-closed)', async () => {
      await withTenantScope(tenantAId, (tx) =>
        tx.plan.create({
          data: { tenantId: tenantAId, name: 'Fail Closed Plan', billingCycle: 'MONTHLY', scheduleDaysOfWeek: ['TUE'] },
        }),
      );

      const rows = await appRolePrisma.$queryRaw<unknown[]>`SELECT * FROM "plans"`;
      expect(rows).toHaveLength(0);
    });
  });

  describe('Partial unique indexes', () => {
    it('rejects a second open-ended PlanPrice for the same plan, but allows one after the first is closed', async () => {
      const plan = await superuserPrisma.plan.create({
        data: { tenantId: tenantMainId, name: 'PlanPrice Test Plan', billingCycle: 'MONTHLY', scheduleDaysOfWeek: ['MON'] },
      });

      await superuserPrisma.planPrice.create({
        data: { tenantId: tenantMainId, planId: plan.id, amount: '500.00', effectiveFrom: new Date('2026-01-01') },
      });

      await expect(
        superuserPrisma.planPrice.create({
          data: { tenantId: tenantMainId, planId: plan.id, amount: '550.00', effectiveFrom: new Date('2026-02-01') },
        }),
      ).rejects.toThrow();

      await superuserPrisma.planPrice.updateMany({
        where: { planId: plan.id, effectiveTo: null },
        data: { effectiveTo: new Date('2026-01-31') },
      });

      await expect(
        superuserPrisma.planPrice.create({
          data: { tenantId: tenantMainId, planId: plan.id, amount: '550.00', effectiveFrom: new Date('2026-02-01') },
        }),
      ).resolves.toBeDefined();
    });

    it('rejects a second EnrollmentBillingTerms for the same enrollment', async () => {
      await superuserPrisma.enrollmentBillingTerms.create({
        data: { tenantId: tenantMainId, enrollmentId, billingGuardianId: guardianId },
      });

      await expect(
        superuserPrisma.enrollmentBillingTerms.create({
          data: { tenantId: tenantMainId, enrollmentId, billingGuardianId: guardianId },
        }),
      ).rejects.toThrow();
    });

    it('rejects a second open-ended SiblingDiscountTier for the same threshold', async () => {
      await superuserPrisma.siblingDiscountTier.create({
        data: {
          tenantId: tenantMainId,
          siblingCountThreshold: 2,
          discountPercentage: '10.00',
          effectiveFrom: new Date('2026-01-01'),
        },
      });

      await expect(
        superuserPrisma.siblingDiscountTier.create({
          data: {
            tenantId: tenantMainId,
            siblingCountThreshold: 2,
            discountPercentage: '15.00',
            effectiveFrom: new Date('2026-01-01'),
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('CHECK constraints', () => {
    it('rejects a Waiver with no effectiveTo and reviewAnnually false, accepts one with reviewAnnually true', async () => {
      await expect(
        superuserPrisma.waiver.create({
          data: {
            tenantId: tenantMainId,
            childId,
            type: 'FULL',
            percentage: '100.00',
            reasonCode: 'HARDSHIP',
            effectiveFrom: new Date('2026-01-01'),
            reviewAnnually: false,
            approvedBy: '00000000-0000-0000-0000-000000000000',
          },
        }),
      ).rejects.toThrow();

      await expect(
        superuserPrisma.waiver.create({
          data: {
            tenantId: tenantMainId,
            childId,
            type: 'FULL',
            percentage: '100.00',
            reasonCode: 'HARDSHIP',
            effectiveFrom: new Date('2026-01-01'),
            reviewAnnually: true,
            approvedBy: '00000000-0000-0000-0000-000000000000',
          },
        }),
      ).resolves.toBeDefined();
    });

    it('rejects a CreditNote missing appliedToInvoiceId/refundedVia for terminal statuses that require them', async () => {
      const invoice = await superuserPrisma.invoice.create({
        data: {
          tenantId: tenantMainId,
          childId,
          billedToGuardianId: guardianId,
          status: 'ISSUED',
          totalAmount: '100.00',
          invoiceNumber: `INV-CHECK-${Date.now()}`,
        },
      });

      await expect(
        superuserPrisma.creditNote.create({
          data: {
            tenantId: tenantMainId,
            invoiceId: invoice.id,
            guardianId,
            amount: '20.00',
            reasonCode: 'OVERCHARGE_CORRECTION',
            status: 'APPLIED',
            creditNoteNumber: `CN-CHECK-APPLIED-${Date.now()}`,
            createdBy: '00000000-0000-0000-0000-000000000000',
          },
        }),
      ).rejects.toThrow();

      await expect(
        superuserPrisma.creditNote.create({
          data: {
            tenantId: tenantMainId,
            invoiceId: invoice.id,
            guardianId,
            amount: '20.00',
            reasonCode: 'OVERCHARGE_CORRECTION',
            status: 'REFUNDED',
            creditNoteNumber: `CN-CHECK-REFUNDED-${Date.now()}`,
            createdBy: '00000000-0000-0000-0000-000000000000',
          },
        }),
      ).rejects.toThrow();

      await expect(
        superuserPrisma.creditNote.create({
          data: {
            tenantId: tenantMainId,
            invoiceId: invoice.id,
            guardianId,
            amount: '20.00',
            reasonCode: 'OVERCHARGE_CORRECTION',
            status: 'OPEN',
            creditNoteNumber: `CN-CHECK-OPEN-${Date.now()}`,
            createdBy: '00000000-0000-0000-0000-000000000000',
          },
        }),
      ).resolves.toBeDefined();
    });

    it('rejects EnrollmentBillingTerms with a customRateAmount but no customRateReason', async () => {
      // Fresh child - Enrollment enforces at most one open enrollment per
      // child, and `childId` already has one from beforeAll/earlier tests.
      const otherChild = await superuserPrisma.child.create({
        data: { tenantId: tenantMainId, firstName: 'Other', lastName: 'Child', dateOfBirth: new Date('2022-01-01') },
      });
      const enrollment = await superuserPrisma.enrollment.create({
        data: { tenantId: tenantMainId, childId: otherChild.id, status: 'ACTIVE', startDate: new Date('2026-03-01') },
      });

      await expect(
        superuserPrisma.enrollmentBillingTerms.create({
          data: {
            tenantId: tenantMainId,
            enrollmentId: enrollment.id,
            billingGuardianId: guardianId,
            customRateAmount: '300.00',
          },
        }),
      ).rejects.toThrow();
    });

    it('rejects a ManualOverride with reasonCode OTHER and no reasonNote', async () => {
      await expect(
        superuserPrisma.manualOverride.create({
          data: {
            tenantId: tenantMainId,
            overrideType: 'ONE_TIME_CHARGE',
            reasonCode: 'OTHER',
            relatedEntityType: 'Invoice',
            relatedEntityId: '00000000-0000-0000-0000-000000000000',
            newValue: '10.00',
            appliedBy: '00000000-0000-0000-0000-000000000000',
            appliedAt: new Date(),
          },
        }),
      ).rejects.toThrow();
    });

    it('rejects a negative Fee amount', async () => {
      await expect(
        superuserPrisma.fee.create({
          data: { tenantId: tenantMainId, name: 'Invalid Fee', amount: '-5.00', type: 'ONE_TIME' },
        }),
      ).rejects.toThrow();
    });

    it('rejects a Tenant.billingAnchorDay outside 1-28', async () => {
      await expect(
        superuserPrisma.tenant.update({ where: { id: tenantMainId }, data: { billingAnchorDay: 29 } }),
      ).rejects.toThrow();
      await expect(
        superuserPrisma.tenant.update({ where: { id: tenantMainId }, data: { billingAnchorDay: 0 } }),
      ).rejects.toThrow();
    });
  });

  describe('Enrollment <-> EnrollmentBillingTerms', () => {
    it('resolves the 1:1 relationship via Prisma include', async () => {
      // Fresh child - see the note in the customRateReason test above.
      const otherChild = await superuserPrisma.child.create({
        data: { tenantId: tenantMainId, firstName: 'Third', lastName: 'Child', dateOfBirth: new Date('2022-01-01') },
      });
      const enrollment = await superuserPrisma.enrollment.create({
        data: { tenantId: tenantMainId, childId: otherChild.id, status: 'ACTIVE', startDate: new Date('2026-04-01') },
      });
      await superuserPrisma.enrollmentBillingTerms.create({
        data: { tenantId: tenantMainId, enrollmentId: enrollment.id, billingGuardianId: guardianId },
      });

      const withTerms = await superuserPrisma.enrollment.findUnique({
        where: { id: enrollment.id },
        include: { billingTerms: true },
      });

      expect(withTerms?.billingTerms).toHaveLength(1);
      expect(withTerms?.billingTerms[0].billingGuardianId).toBe(guardianId);
    });
  });

  describe('Invoice/Payment shape changes', () => {
    it('enforces unique invoiceNumber per tenant and requires it', async () => {
      const number = `INV-UNIQUE-${Date.now()}`;
      await superuserPrisma.invoice.create({
        data: {
          tenantId: tenantMainId,
          childId,
          billedToGuardianId: guardianId,
          status: 'DRAFT',
          totalAmount: '10.00',
          invoiceNumber: number,
        },
      });

      await expect(
        superuserPrisma.invoice.create({
          data: {
            tenantId: tenantMainId,
            childId,
            billedToGuardianId: guardianId,
            status: 'DRAFT',
            totalAmount: '10.00',
            invoiceNumber: number,
          },
        }),
      ).rejects.toThrow();
    });

    it('requires guardianId on Payment but allows invoiceId to be null, and allocates via PaymentAllocation', async () => {
      const invoiceA = await superuserPrisma.invoice.create({
        data: {
          tenantId: tenantMainId,
          childId,
          billedToGuardianId: guardianId,
          status: 'ISSUED',
          totalAmount: '80.00',
          invoiceNumber: `INV-ALLOC-A-${Date.now()}`,
        },
      });
      const invoiceB = await superuserPrisma.invoice.create({
        data: {
          tenantId: tenantMainId,
          childId,
          billedToGuardianId: guardianId,
          status: 'ISSUED',
          totalAmount: '20.00',
          invoiceNumber: `INV-ALLOC-B-${Date.now()}`,
        },
      });

      // A single lump-sum payment against the guardian, not tied to one invoice.
      const payment = await superuserPrisma.payment.create({
        data: {
          tenantId: tenantMainId,
          guardianId,
          invoiceId: null,
          amount: '100.00',
          paymentMethod: 'CASH',
          paidAt: new Date(),
        },
      });
      expect(payment.invoiceId).toBeNull();

      // Split across both outstanding invoices via PaymentAllocation.
      await superuserPrisma.paymentAllocation.createMany({
        data: [
          { tenantId: tenantMainId, paymentId: payment.id, invoiceId: invoiceA.id, amountApplied: '80.00' },
          { tenantId: tenantMainId, paymentId: payment.id, invoiceId: invoiceB.id, amountApplied: '20.00' },
        ],
      });

      const allocations = await superuserPrisma.paymentAllocation.findMany({ where: { paymentId: payment.id } });
      expect(allocations).toHaveLength(2);
      expect(allocations.reduce((sum, a) => sum + Number(a.amountApplied), 0)).toBe(100);

      await expect(
        superuserPrisma.payment.create({
          data: { tenantId: tenantMainId, invoiceId: null, amount: '10.00', paymentMethod: 'CASH', paidAt: new Date() } as never,
        }),
      ).rejects.toThrow();
    });
  });
});
