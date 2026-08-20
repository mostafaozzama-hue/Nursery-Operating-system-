-- Easy Enrollment (Product Gap H, phase 2): additive, nullable field only.
-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "planned_end_date" DATE;
