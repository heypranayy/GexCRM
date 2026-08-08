"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals } from "@/lib/serialize-decimals";
import { revalidatePath } from "next/cache";

export async function getCeoDashboardMetrics() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    throw new Error("Forbidden — CEO/Admin access required");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalEmployees,
    activeProjects,
    openOpportunities,
    monthlyRevenue,
    yearlyRevenue,
    pendingInvoices,
    todayAttendance,
    openTasks,
    pendingTransfers,
    recentAuditLogs,
  ] = await Promise.all([
    prismadb.users.count({ where: { userStatus: "ACTIVE", banned: false } }),
    prismadb.boards.count(),
    prismadb.crm_Opportunities.count({
      where: { status: "ACTIVE", deletedAt: null },
    }),
    prismadb.invoices.aggregate({
      where: {
        type: "INVOICE",
        status: { in: ["PAID", "PARTIALLY_PAID", "ISSUED", "SENT"] },
        issueDate: { gte: startOfMonth },
      },
      _sum: { grandTotal: true, paidTotal: true },
    }),
    prismadb.invoices.aggregate({
      where: {
        type: "INVOICE",
        status: { in: ["PAID", "PARTIALLY_PAID"] },
        issueDate: { gte: startOfYear },
      },
      _sum: { paidTotal: true },
    }),
    prismadb.invoices.count({
      where: { status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    }),
    prismadb.attendance.count({ where: { date: today } }),
    prismadb.tasks.count({ where: { taskStatus: "ACTIVE" } }),
    prismadb.taskTransferRequest.count({ where: { status: "pending" } }),
    prismadb.crm_AuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const monthlyRevenueData = await prismadb.invoices.groupBy({
    by: ["issueDate"],
    where: {
      type: "INVOICE",
      status: { in: ["PAID", "PARTIALLY_PAID"] },
      issueDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
    },
    _sum: { paidTotal: true },
  });

  const departmentPerformance = await prismadb.users.groupBy({
    by: ["departmentId"],
    where: { userStatus: "ACTIVE" },
    _count: { id: true },
  });

  return serializeDecimals({
    stats: {
      totalEmployees,
      activeProjects,
      openOpportunities,
      monthlyRevenue: Number(monthlyRevenue._sum.grandTotal ?? 0),
      monthlyCollected: Number(monthlyRevenue._sum.paidTotal ?? 0),
      yearlyRevenue: Number(yearlyRevenue._sum.paidTotal ?? 0),
      pendingInvoices,
      todayAttendance,
      openTasks,
      pendingTransfers,
    },
    monthlyRevenueChart: monthlyRevenueData.map((r) => ({
      date: r.issueDate,
      revenue: Number(r._sum.paidTotal ?? 0),
    })),
    departmentHeadcount: departmentPerformance,
    recentAudit: recentAuditLogs.map((log) => ({
      id: log.id,
      user: log.user?.name ?? log.user?.email ?? "System",
      action: log.action,
      entity: log.entityType,
      timestamp: log.createdAt,
      details: log.changes ? JSON.stringify(log.changes).slice(0, 100) : "",
    })),
  });
}

export async function saveDashboardLayout(data: {
  name: string;
  type: string;
  widgets: unknown[];
  isDefault?: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  if (data.isDefault) {
    await prismadb.dashboardLayout.updateMany({
      where: { userId: session.user.id, type: data.type },
      data: { isDefault: false },
    });
  }

  const layout = await prismadb.dashboardLayout.create({
    data: {
      userId: session.user.id,
      name: data.name,
      type: data.type,
      widgets: data.widgets as object[],
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/admin-dashboard");
  return serializeDecimals(layout);
}

export async function getDashboardLayout(type: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const layout = await prismadb.dashboardLayout.findFirst({
    where: { userId: session.user.id, type, isDefault: true },
  });

  return layout ? serializeDecimals(layout) : null;
}
