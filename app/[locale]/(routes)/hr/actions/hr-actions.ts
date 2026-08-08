"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { hasPermission } from "@/lib/permissions";
import { calculatePayout, summarizeAttendance } from "@/lib/payroll/calculate-payout";
import { summarizeLeaveForPayroll, unpaidLeaveDeduction } from "@/lib/leave/payroll-leave";
import { revalidatePath } from "next/cache";

async function requireHrOrAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const canAccess =
    session.user.role === "admin" ||
    (await hasPermission(session.user.id, "attendance", "approve")) ||
    (await hasPermission(session.user.id, "users", "read"));
  if (!canAccess) throw new Error("Forbidden");
  return session;
}

export async function getHrDashboardData() {
  await requireHrOrAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [employees, todayAttendance, payouts, candidates, shifts] = await Promise.all([
    prismadb.users.findMany({
      where: { userStatus: "ACTIVE", banned: false },
      select: {
        id: true,
        name: true,
        email: true,
        baseSalary: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        shiftAssignments: {
          where: { endDate: null },
          take: 1,
          include: { shift: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prismadb.attendance.findMany({
      where: { date: today },
      include: {
        user: { select: { id: true, name: true, department: { select: { name: true } } } },
      },
    }),
    prismadb.payout.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 20,
      include: {
        user: { select: { name: true, department: { select: { name: true } } } },
      },
    }),
    prismadb.hiringCandidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismadb.shift.findMany({ where: { isActive: true } }),
  ]);

  const attendanceMap = new Map(todayAttendance.map((a) => [a.userId, a]));

  const employeeRows = employees.map((e) => {
    const att = attendanceMap.get(e.id);
    return {
      id: e.id,
      name: e.name ?? e.email,
      department: e.department?.name ?? "—",
      designation: e.designation?.name ?? "—",
      shiftName: e.shiftAssignments[0]?.shift?.name ?? "General",
      status: att?.status ?? "absent",
      clockIn: att?.clockIn,
      clockOut: att?.clockOut,
      totalHours: att?.totalHours,
    };
  });

  return serializeDecimals({
    employees: employeeRows,
    payouts: serializeDecimalsList(payouts),
    candidates: serializeDecimalsList(candidates),
    shifts: serializeDecimalsList(shifts),
    stats: {
      totalEmployees: employees.length,
      presentToday: todayAttendance.filter((a) => a.status === "present" || a.status === "late").length,
      absentToday: employees.length - todayAttendance.length,
      openCandidates: candidates.filter((c) => !["hired", "rejected"].includes(c.stage)).length,
    },
  });
}

export async function calculateMonthlyPayouts(month: number, year: number) {
  await requireHrOrAdmin();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const users = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE", banned: false, baseSalary: { not: null } },
    select: { id: true, baseSalary: true },
  });

  const workingDays = endDate.getDate();
  const results = [];

  for (const user of users) {
    const attendance = await prismadb.attendance.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate, lte: endDate },
      },
    });

    const summary = summarizeAttendance(
      attendance.map((a) => ({
        status: a.status,
        totalHours: a.totalHours != null ? Number(a.totalHours) : null,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
      }))
    );

    const leaveApps = await prismadb.leaveApplication.findMany({
      where: {
        userId: user.id,
        status: "approved",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { leaveType: true },
    });

    const baseSalary = Number(user.baseSalary ?? 0);
    const { unpaidLeaveDays } = summarizeLeaveForPayroll(leaveApps, month, year);
    const leaveDeduction = unpaidLeaveDeduction(baseSalary, workingDays, unpaidLeaveDays);

    const calc = calculatePayout({
      baseSalary,
      workingDays,
      attendance: summary,
      extraDeductions: leaveDeduction,
    });

    const payout = await prismadb.payout.upsert({
      where: { userId_month_year: { userId: user.id, month, year } },
      create: {
        userId: user.id,
        month,
        year,
        baseSalary,
        workingDays,
        presentDays: calc.presentDays,
        absentDays: calc.absentDays,
        lateDays: calc.lateDays,
        halfDays: calc.halfDays,
        overtimeHours: calc.overtimeHours,
        overtimeAmount: calc.overtimeAmount,
        deductions: calc.deductions,
        bonus: calc.bonus,
        netPay: calc.netPay,
        status: "calculated",
      },
      update: {
        baseSalary,
        workingDays,
        presentDays: calc.presentDays,
        absentDays: calc.absentDays,
        lateDays: calc.lateDays,
        halfDays: calc.halfDays,
        overtimeHours: calc.overtimeHours,
        overtimeAmount: calc.overtimeAmount,
        deductions: calc.deductions,
        bonus: calc.bonus,
        netPay: calc.netPay,
        status: "calculated",
      },
    });

    results.push(payout);
  }

  revalidatePath("/hr");
  return serializeDecimalsList(results);
}

export async function updateCandidateStage(candidateId: string, stage: string) {
  await requireHrOrAdmin();
  const candidate = await prismadb.hiringCandidate.update({
    where: { id: candidateId },
    data: { stage },
  });
  revalidatePath("/hr");
  return serializeDecimals(candidate);
}

export async function approvePayout(payoutId: string) {
  const session = await requireHrOrAdmin();
  const payout = await prismadb.payout.update({
    where: { id: payoutId },
    data: {
      status: "approved",
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
  });
  revalidatePath("/hr");
  return serializeDecimals(payout);
}
