-- CreateConstraint (a closed enrollment's end date can never precede its start date)
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_date_range_valid" CHECK ("end_date" IS NULL OR "end_date" >= "start_date");
