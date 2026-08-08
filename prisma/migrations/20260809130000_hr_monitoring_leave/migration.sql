-- Leave, monitoring, work sessions

CREATE TABLE IF NOT EXISTS "LeaveType" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT true,
  "maxDays" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveType_companyId_code_key" ON "LeaveType"("companyId", "code");

CREATE TABLE IF NOT EXISTS "LeaveBalance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "leaveTypeId" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "allocated" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "used" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveBalance_userId_leaveTypeId_year_key" ON "LeaveBalance"("userId", "leaveTypeId", "year");
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "LeaveApplication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "leaveTypeId" UUID NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "days" DECIMAL(6,2) NOT NULL,
  "reason" TEXT,
  "attachmentUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id");
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Users"("id");

CREATE TABLE IF NOT EXISTS "MonitoringPolicy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "minIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
  "maxIntervalMinutes" INTEGER NOT NULL DEFAULT 300,
  "maxMissedBeforeWarning" INTEGER NOT NULL DEFAULT 3,
  "gracePeriodSeconds" INTEGER NOT NULL DEFAULT 120,
  "screenshotOnWorkUpdate" BOOLEAN NOT NULL DEFAULT true,
  "activityMetricsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "workHoursStart" TEXT NOT NULL DEFAULT '09:00',
  "workHoursEnd" TEXT NOT NULL DEFAULT '18:00',
  "notifyEmployees" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonitoringPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MonitoringPolicy_companyId_key" ON "MonitoringPolicy"("companyId");
ALTER TABLE "MonitoringPolicy" ADD CONSTRAINT "MonitoringPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "WorkSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "attendanceId" UUID,
  "taskId" UUID,
  "boardId" UUID,
  "activityLabel" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "idleSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL;
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Tasks"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "ProductivityCheck" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "workSessionId" UUID,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "triggeredAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "missedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductivityCheck_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProductivityCheck" ADD CONSTRAINT "ProductivityCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
ALTER TABLE "ProductivityCheck" ADD CONSTRAINT "ProductivityCheck_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "WorkCheckResponse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "responseType" TEXT NOT NULL,
  "workDone" TEXT,
  "workInProgress" TEXT,
  "blockers" TEXT,
  "estimatedCompletion" TEXT,
  "onCall" BOOLEAN NOT NULL DEFAULT false,
  "screenshotKey" TEXT,
  "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkCheckResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkCheckResponse_checkId_key" ON "WorkCheckResponse"("checkId");
ALTER TABLE "WorkCheckResponse" ADD CONSTRAINT "WorkCheckResponse_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ProductivityCheck"("id") ON DELETE CASCADE;
ALTER TABLE "WorkCheckResponse" ADD CONSTRAINT "WorkCheckResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
