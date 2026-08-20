-- Product Gap v2, Group B (Staff / Teacher Management): Basic Profile +
-- Professional Information fields on Staff. Additive/nullable only, except
-- employment_status which gets a NOT NULL DEFAULT 'ACTIVE' so every existing
-- Staff row backfills to the same value CreateStaffDto now defaults to.
--
-- Sensitive personal fields (address/date_of_birth/email/employee_id/gender/
-- identification_number/identification_type/nationality/phone) are stripped
-- from API responses for non-OWNER/ADMIN callers at the application layer
-- (StaffService), not via any DB-level mechanism - see
-- staff-sensitive-fields.ts.

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "address" TEXT,
ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "employment_status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "identification_number" TEXT,
ADD COLUMN     "identification_type" TEXT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photo_url" TEXT,
ADD COLUMN     "preferred_name" TEXT,
ADD COLUMN     "qualifications" TEXT,
ADD COLUMN     "years_of_experience" INTEGER;
