"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { hasPermission } from "@/lib/permissions";
import {
  computeNextCheckTime,
  isWithinWorkHours,
  DEFAULT_MONITORING_POLICY,
} from "@/lib/monitoring/random-check";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getPolicyForUser(userId: string) {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) return DEFAULT_MONITORING_POLICY;

  const policy = await prismadb.monitoringPolicy.findUnique({
    where: { companyId: user.companyId },
  });

  if (!policy || !policy.enabled) return null;

  return {
    minIntervalMinutes: policy.minIntervalMinutes,
    maxIntervalMinutes: policy.maxIntervalMinutes,
    gracePeriodSeconds: policy.gracePeriodSeconds,
    workHoursStart: policy.workHoursStart,
    workHoursEnd: policy.workHoursEnd,
    maxMissedBeforeWarning: policy.maxMissedBeforeWarning,
    screenshotOnWorkUpdate: policy.screenshotOnWorkUpdate,
    companyId: policy.companyId,
  };
}

export async function getActiveWorkSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const ws = await prismadb.workSession.findFirst({
    where: { userId: session.user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: { task: { select: { id: true, title: true } } },
  });

  return ws ? serializeDecimals(ws) : null;
}

export async function startWorkSession(data: {
  taskId?: string;
  boardId?: string;
  activityLabel?: string;
  attendanceId?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  await prismadb.workSession.updateMany({
    where: { userId: session.user.id, endedAt: null },
    data: { endedAt: new Date() },
  });

  const ws = await prismadb.workSession.create({
    data: {
      userId: session.user.id,
      taskId: data.taskId,
      boardId: data.boardId,
      activityLabel: data.activityLabel,
      attendanceId: data.attendanceId,
    },
    include: { task: { select: { id: true, title: true } } },
  });

  revalidatePath("/attendance");
  return serializeDecimals(ws);
}

export async function updateWorkSessionTask(taskId: string, activityLabel?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const ws = await prismadb.workSession.findFirst({
    where: { userId: session.user.id, endedAt: null },
  });
  if (!ws) throw new Error("No active work session");

  const updated = await prismadb.workSession.update({
    where: { id: ws.id },
    data: { taskId, activityLabel },
    include: { task: { select: { id: true, title: true } } },
  });

  return serializeDecimals(updated);
}

export async function endWorkSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const ws = await prismadb.workSession.findFirst({
    where: { userId: session.user.id, endedAt: null },
  });
  if (!ws) return null;

  const updated = await prismadb.workSession.update({
    where: { id: ws.id },
    data: { endedAt: new Date() },
  });

  revalidatePath("/attendance");
  return serializeDecimals(updated);
}

export async function getMyAssignedTasks() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const tasks = await prismadb.tasks.findMany({
    where: { user: session.user.id, taskStatus: "ACTIVE" },
    select: { id: true, title: true, section: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return serializeDecimalsList(tasks);
}

/** Poll: should a check fire now? Creates check server-side if due. */
export async function pollWorkCheck() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const policy = await getPolicyForUser(session.user.id);
  if (!policy) return { active: false };

  const clockedIn = await prismadb.attendance.findFirst({
    where: {
      userId: session.user.id,
      date: new Date(new Date().setHours(0, 0, 0, 0)),
      clockOut: null,
    },
  });
  if (!clockedIn) return { active: false, reason: "not_clocked_in" };

  const onBreak = await prismadb.breakLog.findFirst({
    where: { attendanceId: clockedIn.id, endTime: null },
  });
  if (onBreak) return { active: false, reason: "on_break" };

  if (!isWithinWorkHours(new Date(), policy.workHoursStart, policy.workHoursEnd)) {
    return { active: false, reason: "outside_work_hours" };
  }

  const pending = await prismadb.productivityCheck.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["pending", "work_update_required"] },
    },
    orderBy: { scheduledAt: "desc" },
  });

  if (pending) {
    const now = new Date();
    if (pending.status === "pending" && now > pending.expiresAt) {
      const missed = pending.missedCount + 1;
      const needsUpdate = missed >= policy.maxMissedBeforeWarning;
      await prismadb.productivityCheck.update({
        where: { id: pending.id },
        data: {
          missedCount: missed,
          status: needsUpdate ? "work_update_required" : "missed",
        },
      });
      if (needsUpdate) {
        return {
          active: true,
          checkId: pending.id,
          type: "work_update_required",
          message: "Please submit a work update after missed check-ins.",
        };
      }
    } else if (pending.status === "work_update_required") {
      return {
        active: true,
        checkId: pending.id,
        type: "work_update_required",
        message: "Work update required.",
      };
    } else if (pending.triggeredAt) {
      return {
        active: true,
        checkId: pending.id,
        type: "quick_check",
        message: "Quick work check — acknowledge you're working.",
        expiresAt: pending.expiresAt.toISOString(),
      };
    }
  }

  const lastCheck = await prismadb.productivityCheck.findFirst({
    where: { userId: session.user.id },
    orderBy: { scheduledAt: "desc" },
  });

  const base = lastCheck?.scheduledAt ?? new Date();
  const nextAt = computeNextCheckTime(policy, base);

  if (new Date() < nextAt) {
    return { active: false, nextCheckAt: nextAt.toISOString() };
  }

  const ws = await prismadb.workSession.findFirst({
    where: { userId: session.user.id, endedAt: null },
  });

  const expiresAt = new Date(Date.now() + policy.gracePeriodSeconds * 1000);
  const check = await prismadb.productivityCheck.create({
    data: {
      userId: session.user.id,
      workSessionId: ws?.id,
      scheduledAt: new Date(),
      triggeredAt: new Date(),
      expiresAt,
      status: "pending",
    },
  });

  return {
    active: true,
    checkId: check.id,
    type: "quick_check",
    message: "Quick work check — tap Acknowledge or Update Work.",
    expiresAt: expiresAt.toISOString(),
  };
}

const respondSchema = z.object({
  checkId: z.string().uuid(),
  responseType: z.enum(["acknowledge", "work_update"]),
  workDone: z.string().optional(),
  workInProgress: z.string().optional(),
  blockers: z.string().optional(),
  estimatedCompletion: z.string().optional(),
  onCall: z.boolean().optional(),
  screenshotKey: z.string().optional(),
});

export async function respondToWorkCheck(raw: unknown) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const input = respondSchema.parse(raw);

  const check = await prismadb.productivityCheck.findFirst({
    where: { id: input.checkId, userId: session.user.id },
  });
  if (!check) throw new Error("Check not found");

  if (input.responseType === "work_update" && !input.workDone?.trim()) {
    throw new Error("Please describe work completed");
  }

  await prismadb.$transaction(async (tx) => {
    await tx.workCheckResponse.create({
      data: {
        checkId: input.checkId,
        userId: session.user.id,
        responseType: input.responseType,
        workDone: input.workDone,
        workInProgress: input.workInProgress,
        blockers: input.blockers,
        estimatedCompletion: input.estimatedCompletion,
        onCall: input.onCall ?? false,
        screenshotKey: input.screenshotKey,
      },
    });

    await tx.productivityCheck.update({
      where: { id: input.checkId },
      data: { status: "completed", missedCount: 0 },
    });
  });

  revalidatePath("/attendance");
  revalidatePath("/hr/monitoring");
  return { success: true };
}

export async function reportActivityPulse(activeSeconds: number, idleSeconds: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const ws = await prismadb.workSession.findFirst({
    where: { userId: session.user.id, endedAt: null },
  });
  if (!ws) return { ok: true };

  await prismadb.workSession.update({
    where: { id: ws.id },
    data: {
      activeSeconds: ws.activeSeconds + Math.min(activeSeconds, 300),
      idleSeconds: ws.idleSeconds + Math.min(idleSeconds, 300),
    },
  });

  return { ok: true };
}

export async function getMonitoringDashboard(filters?: {
  companyId?: string;
  date?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const allowed =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "attendance", "read"));
  if (!allowed) throw new Error("Forbidden");

  const date = filters?.date
    ? new Date(filters.date)
    : new Date();
  date.setHours(0, 0, 0, 0);

  const sessions = await prismadb.workSession.findMany({
    where: {
      startedAt: { gte: date },
      ...(filters?.companyId
        ? { user: { companyId: filters.companyId } }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, companyId: true } },
      task: { select: { id: true, title: true } },
      attendance: true,
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  const checks = await prismadb.productivityCheck.findMany({
    where: {
      scheduledAt: { gte: date },
      status: { in: ["missed", "work_update_required"] },
      ...(filters?.companyId
        ? { user: { companyId: filters.companyId } }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      response: true,
    },
    take: 50,
  });

  const clockedIn = await prismadb.attendance.findMany({
    where: {
      date,
      clockOut: null,
      ...(filters?.companyId
        ? { user: { companyId: filters.companyId } }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return serializeDecimals({ sessions, checks, clockedIn, date: date.toISOString() });
}

export async function ensureMonitoringPolicy(companyId: string) {
  const existing = await prismadb.monitoringPolicy.findUnique({
    where: { companyId },
  });
  if (existing) return existing;

  return prismadb.monitoringPolicy.create({
    data: {
      companyId,
      enabled: true,
      minIntervalMinutes: 5,
      maxIntervalMinutes: 300,
      maxMissedBeforeWarning: 3,
      gracePeriodSeconds: 120,
      notifyEmployees: true,
    },
  });
}
