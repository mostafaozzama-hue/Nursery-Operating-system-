-- CreateIndex (partial: at most one active primary contact per child)
CREATE UNIQUE INDEX "child_guardians_one_primary_per_child" ON "child_guardians"("child_id") WHERE "is_primary_contact" = true AND "deleted_at" IS NULL;
