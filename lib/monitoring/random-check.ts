/**
 * Server-side randomized work-check scheduling.
 * Intervals are unpredictable within company policy bounds (e.g. 5 min – 5 hours).
 */

export interface MonitoringPolicyConfig {
  minIntervalMinutes: number;
  maxIntervalMinutes: number;
  gracePeriodSeconds: number;
  workHoursStart: string; // HH:mm
  workHoursEnd: string;
}

export function randomIntervalMs(policy: MonitoringPolicyConfig): number {
  const min = policy.minIntervalMinutes * 60 * 1000;
  const max = policy.maxIntervalMinutes * 60 * 1000;
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function isWithinWorkHours(
  now: Date,
  workHoursStart: string,
  workHoursEnd: string,
): boolean {
  const [startH, startM] = workHoursStart.split(":").map(Number);
  const [endH, endM] = workHoursEnd.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return minutes >= start && minutes <= end;
}

export function computeNextCheckTime(
  policy: MonitoringPolicyConfig,
  from: Date = new Date(),
): Date {
  const delay = randomIntervalMs(policy);
  let next = new Date(from.getTime() + delay);

  // If outside work hours, push to next work day start
  if (!isWithinWorkHours(next, policy.workHoursStart, policy.workHoursEnd)) {
    const [startH, startM] = policy.workHoursStart.split(":").map(Number);
    next.setDate(next.getDate() + (next.getHours() >= parseInt(policy.workHoursEnd.split(":")[0]) ? 1 : 0));
    next.setHours(startH, startM, 0, 0);
    next = new Date(next.getTime() + randomIntervalMs(policy));
  }

  return next;
}

export const DEFAULT_MONITORING_POLICY: MonitoringPolicyConfig = {
  minIntervalMinutes: 5,
  maxIntervalMinutes: 300,
  gracePeriodSeconds: 120,
  workHoursStart: "09:00",
  workHoursEnd: "18:00",
};
