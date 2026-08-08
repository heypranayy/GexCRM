"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function requestTaskTransfer(data: {
  taskId: string;
  toUserId: string;
  reason?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const task = await prismadb.tasks.findUnique({ where: { id: data.taskId } });
  if (!task) throw new Error("Task not found");

  if (task.user !== session.user.id && session.user.role !== "admin") {
    throw new Error("You can only transfer tasks assigned to you");
  }

  const request = await prismadb.taskTransferRequest.create({
    data: {
      taskId: data.taskId,
      fromUserId: session.user.id,
      toUserId: data.toUserId,
      reason: data.reason,
      status: "pending",
    },
    include: {
      task: { select: { id: true, title: true } },
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
    },
  });

  revalidatePath("/projects");
  return serializeDecimals(request);
}

export async function getPendingTransfers() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const canApprove =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "tasks", "approve"));

  if (!canApprove) throw new Error("Forbidden");

  const requests = await prismadb.taskTransferRequest.findMany({
    where: { status: "pending" },
    include: {
      task: { select: { id: true, title: true, section: true } },
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return serializeDecimalsList(requests);
}

export async function approveTaskTransfer(requestId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const canApprove =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "tasks", "approve"));

  if (!canApprove) throw new Error("Forbidden");

  const request = await prismadb.taskTransferRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.status !== "pending") throw new Error("Invalid transfer request");

  await prismadb.$transaction([
    prismadb.tasks.update({
      where: { id: request.taskId },
      data: { user: request.toUserId },
    }),
    prismadb.taskTransferRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/projects");
  revalidatePath("/task-transfers");
  return { success: true };
}

export async function rejectTaskTransfer(requestId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const canApprove =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "tasks", "approve"));

  if (!canApprove) throw new Error("Forbidden");

  await prismadb.taskTransferRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/task-transfers");
  return { success: true };
}

export async function assignTaskToUser(taskId: string, userId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const canAssign =
    session.user.role === "admin" ||
    session.user.role === "manager" ||
    (await hasPermission(session.user.id, "tasks", "assign"));

  if (!canAssign) throw new Error("Forbidden");

  const task = await prismadb.tasks.update({
    where: { id: taskId },
    data: { user: userId },
  });

  revalidatePath("/projects");
  return serializeDecimals(task);
}
