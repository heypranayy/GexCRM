"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireAttendanceEdit() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const canEdit =
    session.user.role === "admin" ||
    (await hasPermission(session.user.id, "attendance", "update")) ||
    (await hasPermission(session.user.id, "attendance", "approve"));
  if (!canEdit) throw new Error("Forbidden — HR or CEO access required");
  return session;
}

export async function getTeamAttendance(dateStr?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);

  const canViewAll =
    session.user.role === "admin" ||
    (await hasPermission(session.user.id, "attendance", "read"));

  const records = await prismadb.attendance.findMany({
    where: {
      date,
      ...(canViewAll ? {} : { userId: session.user.id }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      breaks: true,
    },
    orderBy: { clockIn: "asc" },
  });

  return serializeDecimalsList(records);
}

export async function editAttendanceAction(
  attendanceId: string,
  data: {
    clockIn?: string;
    clockOut?: string;
    status?: string;
    editReason: string;
  }
) {
  const session = await requireAttendanceEdit();

  const existing = await prismadb.attendance.findUnique({ where: { id: attendanceId } });
  if (!existing) throw new Error("Attendance record not found");

  const updateData: Record<string, unknown> = {
    editedBy: session.user.id,
    editReason: data.editReason,
  };

  if (data.clockIn) updateData.clockIn = new Date(data.clockIn);
  if (data.clockOut) updateData.clockOut = new Date(data.clockOut);
  if (data.status) updateData.status = data.status;

  if (updateData.clockIn && updateData.clockOut) {
    const inTime = updateData.clockIn as Date;
    const outTime = updateData.clockOut as Date;
    updateData.totalHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
  } else if (existing.clockIn && updateData.clockOut) {
    const outTime = updateData.clockOut as Date;
    updateData.totalHours = (outTime.getTime() - existing.clockIn.getTime()) / (1000 * 60 * 60);
  }

  const attendance = await prismadb.attendance.update({
    where: { id: attendanceId },
    data: updateData,
  });

  revalidatePath("/attendance");
  revalidatePath("/hr");
  return serializeDecimals(attendance);
}

export async function markAbsentAction(userId: string, dateStr: string, reason: string) {
  const session = await requireAttendanceEdit();
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const attendance = await prismadb.attendance.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      clockIn: date,
      status: "absent",
      editedBy: session.user.id,
      editReason: reason,
    },
    update: {
      status: "absent",
      editedBy: session.user.id,
      editReason: reason,
    },
  });

  revalidatePath("/attendance");
  return serializeDecimals(attendance);
}
