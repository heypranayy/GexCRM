"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function getProjectDashboardData(boardId?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const boards = await prismadb.boards.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const selectedBoardId = boardId ?? boards[0]?.id;
  if (!selectedBoardId) {
    return serializeDecimals({ boards: [], stats: null, sprints: [], milestones: [], team: [], timeLogs: [] });
  }

  const board = await prismadb.boards.findUnique({
    where: { id: selectedBoardId },
    include: {
      sprints: {
        orderBy: { startDate: "desc" },
        include: { tasks: { select: { id: true, taskStatus: true } } },
      },
      milestones: {
        orderBy: { dueDate: "asc" },
        include: { tasks: { select: { id: true, taskStatus: true } } },
      },
      sections: {
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              taskStatus: true,
              user: true,
              assigned_user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!board) throw new Error("Board not found");

  const allTasks = board.sections.flatMap((s) => s.tasks);
  const completedTasks = allTasks.filter((t) => t.taskStatus === "COMPLETE").length;

  const timeLogs = await prismadb.timeLog.findMany({
    where: { taskId: { in: allTasks.map((t) => t.id) } },
    include: {
      user: { select: { name: true } },
      task: { select: { title: true } },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  });

  const userStats = new Map<string, { name: string; assigned: number; completed: number; hours: number }>();
  for (const task of allTasks) {
    const uid = task.user ?? "unassigned";
    const name = task.assigned_user?.name ?? "Unassigned";
    if (!userStats.has(uid)) userStats.set(uid, { name, assigned: 0, completed: 0, hours: 0 });
    const stat = userStats.get(uid)!;
    stat.assigned++;
    if (task.taskStatus === "COMPLETE") stat.completed++;
  }

  for (const log of timeLogs) {
    const uid = log.userId;
    if (!userStats.has(uid)) userStats.set(uid, { name: log.user?.name ?? "User", assigned: 0, completed: 0, hours: 0 });
    const stat = userStats.get(uid)!;
    stat.hours += (log.duration ?? 0) / 3600;
  }

  const sprints = board.sprints.map((s) => {
    const total = s.tasks.length;
    const done = s.tasks.filter((t) => t.taskStatus === "COMPLETE").length;
    return {
      id: s.id,
      name: s.name,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      totalTasks: total,
      completedTasks: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const milestones = board.milestones.map((m) => {
    const total = m.tasks.length;
    const done = m.tasks.filter((t) => t.taskStatus === "COMPLETE").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    let status = "on_track";
    if (progress === 100) status = "completed";
    else if (m.dueDate && m.dueDate < new Date() && progress < 80) status = "delayed";
    else if (progress < 50 && m.dueDate && m.dueDate < new Date(Date.now() + 7 * 86400000)) status = "at_risk";
    return {
      id: m.id,
      name: m.name,
      dueDate: m.dueDate,
      progress,
      tasksTotal: total,
      tasksDone: done,
      status,
    };
  });

  const totalHours = timeLogs.reduce((s, l) => s + (l.duration ?? 0) / 3600, 0);
  const activeSprint = sprints.find((s) => s.status === "active");

  return serializeDecimals({
    boards,
    selectedBoardId,
    boardTitle: board.title,
    stats: {
      totalTasks: allTasks.length,
      completedTasks,
      openTasks: allTasks.length - completedTasks,
      totalHours: Math.round(totalHours * 10) / 10,
      sprintVelocity: activeSprint?.progress ?? 0,
      teamSize: userStats.size,
    },
    sprints,
    milestones,
    team: Array.from(userStats.entries()).map(([id, s]) => ({
      id,
      name: s.name,
      tasksAssigned: s.assigned,
      tasksCompleted: s.completed,
      hoursLogged: Math.round(s.hours * 10) / 10,
      utilization: s.assigned > 0 ? Math.round((s.completed / s.assigned) * 100) : 0,
    })),
    timeLogs: timeLogs.map((l) => ({
      id: l.id,
      taskName: l.task?.title ?? "Task",
      user: l.user?.name ?? "—",
      hours: Math.round(((l.duration ?? 0) / 3600) * 10) / 10,
      date: l.startTime,
      description: l.description,
    })),
  });
}
