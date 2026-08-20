-- Easy Enrollment (Product Gap H): additive, nullable fields only.
-- AlterTable
ALTER TABLE "children" ADD COLUMN     "address" TEXT,
ADD COLUMN     "mother_language" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "nickname" TEXT;

-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "address" TEXT;
