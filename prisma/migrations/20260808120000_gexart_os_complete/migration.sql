-- Gexart OS: Complete module schema (work reports, task transfers, dashboard layouts, invoice types)

-- Extend invoice types for quotation and purchase orders
ALTER TYPE "Invoice_Type" ADD VALUE IF NOT EXISTS 'QUOTATION';
ALTER TYPE "Invoice_Type" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';

-- User salary field for payroll calculation
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "baseSalary" DECIMAL(14,2);

-- Attendance HR edit tracking
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "editedBy" UUID;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "editReason" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "totalHours" DECIMAL(8,2);

-- Gexart OS org structure (if not yet created)
CREATE TABLE IF NOT EXISTS "Company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Branch" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Department" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Team" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Designation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PermissionMatrix" (
    "id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "actions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PermissionMatrix_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PermissionMatrix_role_resource_key" ON "PermissionMatrix"("role", "resource");

CREATE TABLE IF NOT EXISTS "Shift" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "isNightShift" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" UUID,
    "branchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ShiftAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShiftAssignment_userId_shiftId_startDate_key" ON "ShiftAssignment"("userId", "shiftId", "startDate");

CREATE TABLE IF NOT EXISTS "Payout" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "presentDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "lateDays" INTEGER NOT NULL DEFAULT 0,
    "halfDays" INTEGER NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payout_userId_month_year_key" ON "Payout"("userId", "month", "year");

CREATE TABLE IF NOT EXISTS "HiringCandidate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "departmentId" UUID,
    "resumeUrl" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'applied',
    "rating" INTEGER,
    "interviewDate" TIMESTAMP(3),
    "notes" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HiringCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "clockInIp" TEXT,
    "clockOutIp" TEXT,
    "clockInLocation" JSONB,
    "clockOutLocation" JSONB,
    "clockInDevice" TEXT,
    "clockOutDevice" TEXT,
    "clockInPhoto" TEXT,
    "clockOutPhoto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'present',
    "mode" TEXT NOT NULL DEFAULT 'office',
    "isFakeGps" BOOLEAN NOT NULL DEFAULT false,
    "editedBy" UUID,
    "editReason" TEXT,
    "totalHours" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_userId_date_key" ON "Attendance"("userId", "date");

CREATE TABLE IF NOT EXISTS "BreakLog" (
    "id" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BreakLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Invoice_GstMeta" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "placeOfSupply" TEXT,
    "supplierGstin" TEXT,
    "customerGstin" TEXT,
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "eWayBillNumber" TEXT,
    "eInvoiceIrn" TEXT,
    "transportMode" TEXT,
    "vehicleNumber" TEXT,
    "invoiceType" TEXT,
    "totalCgst" DECIMAL(14,2),
    "totalSgst" DECIMAL(14,2),
    "totalIgst" DECIMAL(14,2),
    "totalCess" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_GstMeta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_GstMeta_invoiceId_key" ON "Invoice_GstMeta"("invoiceId");

CREATE TABLE IF NOT EXISTS "Sprint" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "boardId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Milestone" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "boardId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TimeLog" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- New Gexart OS tables
CREATE TABLE IF NOT EXISTS "WorkReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "tasksDone" JSONB NOT NULL,
    "hoursWorked" DECIMAL(8,2),
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkReport_userId_date_key" ON "WorkReport"("userId", "date");

CREATE TABLE IF NOT EXISTS "TaskTransferRequest" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaskTransferRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DashboardLayout" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ceo',
    "widgets" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DashboardLayout_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (skip if already exist - use DO blocks)
DO $$ BEGIN
  ALTER TABLE "WorkReport" ADD CONSTRAINT "WorkReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TaskTransferRequest" ADD CONSTRAINT "TaskTransferRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TaskTransferRequest" ADD CONSTRAINT "TaskTransferRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TaskTransferRequest" ADD CONSTRAINT "TaskTransferRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TaskTransferRequest" ADD CONSTRAINT "TaskTransferRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DashboardLayout" ADD CONSTRAINT "DashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
