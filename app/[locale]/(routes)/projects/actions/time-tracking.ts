"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals } from "@/lib/serialize-decimals";
import { revalidatePath } from "next/cache";

export async function startTimeLog(taskId: string, description?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const activeLog = await prismadb.timeLog.findFirst({
    where: {
      userId: session.user.id,
      endTime: null,
    },
  });

  if (activeLog) {
    // Automatically stop any existing active timer first
    await stopTimeLog(activeLog.id);
  }

  const log = await prismadb.timeLog.create({
    data: {
      taskId,
      userId: session.user.id,
      startTime: new Date(),
      description,
    },
  });

  revalidatePath("/projects");
  return serializeDecimals(log);
}

export async function stopTimeLog(logId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const existing = await prismadb.timeLog.findUnique({
    where: { id: logId },
  });

  if (!existing) throw new Error("Time log not found");

  const endTime = new Date();
  const duration = Math.round(
    (endTime.getTime() - new Date(existing.startTime).getTime()) / 1000
  );

  const log = await prismadb.timeLog.update({
    where: { id: logId },
    data: {
      endTime,
      duration,
    },
  });

  revalidatePath("/projects");
  return serializeDecimals(log);
}

export async function getActiveTimeLog() {
  const session = await getSession();
  if (!session) return null;

  const log = await prismadb.timeLog.findFirst({
    where: {
      userId: session.user.id,
      endTime: null,
    },
    include: {
      task: {
        select: { title: true },
      },
    },
  });

  return log ? serializeDecimals(log) : null;
}
