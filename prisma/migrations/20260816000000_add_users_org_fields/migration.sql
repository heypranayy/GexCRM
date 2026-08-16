-- Users org fields referenced in schema.prisma but missing from prior migrations
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "companyId" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "departmentId" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "teamId" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "designationId" UUID;

CREATE INDEX IF NOT EXISTS "Users_companyId_idx" ON "Users"("companyId");
CREATE INDEX IF NOT EXISTS "Users_branchId_idx" ON "Users"("branchId");
CREATE INDEX IF NOT EXISTS "Users_departmentId_idx" ON "Users"("departmentId");
CREATE INDEX IF NOT EXISTS "Users_teamId_idx" ON "Users"("teamId");
CREATE INDEX IF NOT EXISTS "Users_designationId_idx" ON "Users"("designationId");

DO $$ BEGIN
  ALTER TABLE "Users" ADD CONSTRAINT "Users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Users" ADD CONSTRAINT "Users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Users" ADD CONSTRAINT "Users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Users" ADD CONSTRAINT "Users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Users" ADD CONSTRAINT "Users_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
