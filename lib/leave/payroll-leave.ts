import Decimal from "decimal.js";

export interface UnpaidLeaveSummary {
  unpaidLeaveDays: number;
  paidLeaveDays: number;
}

/**
 * Sum approved leave days in a month, split paid vs unpaid.
 */
export function summarizeLeaveForPayroll(
  applications: Array<{
    days: Decimal | number | string;
    startDate: Date;
    status: string;
    leaveType: { isPaid: boolean };
  }>,
  month: number,
  year: number,
): UnpaidLeaveSummary {
  let unpaidLeaveDays = 0;
  let paidLeaveDays = 0;

  for (const app of applications) {
    if (app.status !== "approved") continue;
    const start = app.startDate;
    if (start.getMonth() + 1 !== month || start.getFullYear() !== year) continue;
    const days = Number(app.days);
    if (app.leaveType.isPaid) paidLeaveDays += days;
    else unpaidLeaveDays += days;
  }

  return {
    unpaidLeaveDays: Math.round(unpaidLeaveDays * 100) / 100,
    paidLeaveDays: Math.round(paidLeaveDays * 100) / 100,
  };
}

export function unpaidLeaveDeduction(
  baseSalary: number,
  workingDays: number,
  unpaidLeaveDays: number,
): number {
  if (unpaidLeaveDays <= 0 || workingDays <= 0) return 0;
  const daily = new Decimal(baseSalary).div(workingDays);
  return daily.times(unpaidLeaveDays).toDecimalPlaces(2).toNumber();
}
