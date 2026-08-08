import Decimal from "decimal.js";

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  overtimeHours: number;
}

export interface PayoutCalculationInput {
  baseSalary: number;
  workingDays: number;
  attendance: AttendanceSummary;
  bonus?: number;
  extraDeductions?: number;
}

export interface PayoutCalculationResult {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  overtimeHours: number;
  overtimeAmount: number;
  deductions: number;
  bonus: number;
  netPay: number;
}

/**
 * Calculate monthly payout from base salary and attendance summary.
 * Deductions: absent days + half days (0.5) + late penalty (0.25 day each).
 */
export function calculatePayout(input: PayoutCalculationInput): PayoutCalculationResult {
  const base = new Decimal(input.baseSalary);
  const workingDays = input.workingDays > 0 ? input.workingDays : 22;
  const dailyRate = base.div(workingDays);

  const { presentDays, absentDays, lateDays, halfDays, overtimeHours } = input.attendance;

  const absentDeduction = dailyRate.times(absentDays);
  const halfDayDeduction = dailyRate.times(halfDays).times(0.5);
  const lateDeduction = dailyRate.times(lateDays).times(0.25);
  const overtimeAmount = dailyRate.div(8).times(overtimeHours).times(1.5);

  const bonus = new Decimal(input.bonus ?? 0);
  const extraDeductions = new Decimal(input.extraDeductions ?? 0);

  const deductions = absentDeduction
    .plus(halfDayDeduction)
    .plus(lateDeduction)
    .plus(extraDeductions);

  const earned = dailyRate.times(presentDays).plus(dailyRate.times(halfDays).times(0.5));
  const netPay = earned.plus(overtimeAmount).plus(bonus).minus(deductions);

  return {
    presentDays,
    absentDays,
    lateDays,
    halfDays,
    overtimeHours,
    overtimeAmount: overtimeAmount.toDecimalPlaces(2).toNumber(),
    deductions: deductions.toDecimalPlaces(2).toNumber(),
    bonus: bonus.toDecimalPlaces(2).toNumber(),
    netPay: Decimal.max(netPay, 0).toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Summarize attendance records for a month into payout inputs.
 */
export function summarizeAttendance(
  records: Array<{ status: string; totalHours?: number | null; clockIn: Date; clockOut?: Date | null }>
): AttendanceSummary {
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let overtimeHours = 0;

  for (const r of records) {
    switch (r.status) {
      case "present":
        presentDays++;
        break;
      case "late":
        lateDays++;
        presentDays++;
        break;
      case "half_day":
        halfDays++;
        break;
      case "absent":
        absentDays++;
        break;
      default:
        presentDays++;
    }

    if (r.totalHours != null) {
      const hours = Number(r.totalHours);
      if (hours > 8) overtimeHours += hours - 8;
    } else if (r.clockOut) {
      const hours = (r.clockOut.getTime() - r.clockIn.getTime()) / (1000 * 60 * 60);
      if (hours > 8) overtimeHours += hours - 8;
    }
  }

  return {
    presentDays,
    absentDays,
    lateDays,
    halfDays,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  };
}
