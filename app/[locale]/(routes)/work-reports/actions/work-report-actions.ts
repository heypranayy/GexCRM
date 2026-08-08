"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function submitWorkReport(data: {
  date: string;
  summary: string;
  tasksDone: Array<{ title: string; hours?: number; status?: string }>;
  hoursWorked?: number;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);

  const report = await prismadb.workReport.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    create: {
      userId: session.user.id,
      date,
      summary: data.summary,
      tasksDone: data.tasksDone,
      hoursWorked: data.hoursWorked,
      status: "submitted",
    },
    update: {
      summary: data.summary,
      tasksDone: data.tasksDone,
      hoursWorked: data.hoursWorked,
      status: "submitted",
    },
  });

  revalidatePath("/work-reports");
  return serializeDecimals(report);
}

export async function getMyWorkReports(limit = 30) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const reports = await prismadb.workReport.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
  });

  return serializeDecimalsList(reports);
}

export async function getTeamWorkReports(dateStr?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const canViewAll =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "tasks", "read"));

  if (!canViewAll) throw new Error("Forbidden");

  const where = dateStr
    ? { date: new Date(dateStr) }
    : {};

  const reports = await prismadb.workReport.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true, department: { select: { name: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return serializeDecimalsList(reports);
}

export async function reviewWorkReport(reportId: string, notes?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const canReview =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "tasks", "approve"));

  if (!canReview) throw new Error("Forbidden");

  const report = await prismadb.workReport.update({
    where: { id: reportId },
    data: {
      status: "reviewed",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      notes,
    },
  });

  revalidatePath("/work-reports");
  return serializeDecimals(report);
}
