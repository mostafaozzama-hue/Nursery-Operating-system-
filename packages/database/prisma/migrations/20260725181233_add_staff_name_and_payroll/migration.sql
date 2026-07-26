-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "staff_payroll" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "pay_type" TEXT NOT NULL,
    "pay_rate" DECIMAL(12,2) NOT NULL,
    "pay_frequency" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effective_date" DATE NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "staff_payroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_payroll_tenant_id_idx" ON "staff_payroll"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_payroll_staff_id_idx" ON "staff_payroll"("staff_id");

-- CreateIndex (partial: at most one active StaffPayroll record per staff, per tenant)
CREATE UNIQUE INDEX "staff_payroll_tenant_staff_unique_active" ON "staff_payroll"("tenant_id", "staff_id") WHERE "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "staff_payroll" ADD CONSTRAINT "staff_payroll_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_payroll" ADD CONSTRAINT "staff_payroll_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security for staff_payroll, mirroring the exact pattern used for
-- every other tenant-owned domain table (see add_domain_rls_policies).
ALTER TABLE "staff_payroll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_payroll" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "staff_payroll"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );
