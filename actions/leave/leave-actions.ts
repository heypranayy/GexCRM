"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const applyLeaveSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
});

export async function getLeaveTypes() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const user = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  });

  const types = await prismadb.leaveType.findMany({
    where: {
      active: true,
      OR: [{ companyId: user?.companyId ?? undefined }, { companyId: null }],
    },
    orderBy: { name: "asc" },
  });

  return serializeDecimalsList(types);
}

export async function getMyLeaveApplications() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const apps = await prismadb.leaveApplication.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { leaveType: true },
    take: 50,
  });

  return serializeDecimalsList(apps);
}

export async function getMyLeaveBalances() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const year = new Date().getFullYear();

  const balances = await prismadb.leaveBalance.findMany({
    where: { userId: session.user.id, year },
    include: { leaveType: true },
  });

  return serializeDecimalsList(balances);
}

export async function applyForLeave(raw: unknown) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const input = applyLeaveSchema.parse(raw);
  if (input.endDate < input.startDate) throw new Error("End date must be after start date");

  const days =
    Math.ceil(
      (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  const app = await prismadb.leaveApplication.create({
    data: {
      userId: session.user.id,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason,
      status: "pending",
    },
    include: { leaveType: true },
  });

  revalidatePath("/attendance");
  revalidatePath("/hr");
  return serializeDecimals(app);
}

export async function getPendingLeaveApplications() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const allowed =
    session.user.role === "admin" ||
    (await hasPermission(session.user.id, "attendance", "approve"));
  if (!allowed) throw new Error("Forbidden");

  const apps = await prismadb.leaveApplication.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      leaveType: true,
    },
  });

  return serializeDecimalsList(apps);
}

export async function reviewLeaveApplication(
  applicationId: string,
  approve: boolean,
  reviewNote?: string,
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const allowed =
    session.user.role === "admin" ||
    (await hasPermission(session.user.id, "attendance", "approve"));
  if (!allowed) throw new Error("Forbidden");

  const app = await prismadb.leaveApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { leaveType: true },
  });

  if (app.status !== "pending") throw new Error("Leave already reviewed");

  const status = approve ? "approved" : "rejected";

  const updated = await prismaTransactionReview(app, session.user.id, status, reviewNote);

  revalidatePath("/hr");
  revalidatePath("/attendance");
  return serializeDecimals(updated);
}

async function prismaTransactionReview(
  app: { id: string; userId: string; days: unknown; leaveTypeId: string; leaveType: { isPaid: boolean } },
  reviewerId: string,
  status: string,
  reviewNote?: string,
) {
  return prismadb.$transaction(async (tx) => {
    const updated = await tx.leaveApplication.update({
      where: { id: app.id },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote,
      },
      include: { leaveType: true, user: { select: { name: true } } },
    });

    if (status === "approved" && app.leaveType.isPaid) {
      const year = new Date().getFullYear();
      const balance = await tx.leaveBalance.findFirst({
        where: { userId: app.userId, leaveTypeId: app.leaveTypeId, year },
      });
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: Number(balance.used) + Number(app.days) },
        });
      }
    }

    return updated;
  });
}

export async function seedDefaultLeaveTypes(companyId?: string) {
  const defaults = [
    { name: "Paid Leave", code: "PAID", isPaid: true, maxDays: 12 },
    { name: "Unpaid Leave", code: "UNPAID", isPaid: false },
    { name: "Sick Leave", code: "SICK", isPaid: true, maxDays: 6 },
    { name: "Casual Leave", code: "CASUAL", isPaid: true, maxDays: 6 },
  ];

  for (const d of defaults) {
    const existing = await prismadb.leaveType.findFirst({
      where: { companyId: companyId ?? null, code: d.code },
    });
    if (!existing) {
      await prismadb.leaveType.create({
        data: { ...d, companyId },
      });
    }
  }
}
