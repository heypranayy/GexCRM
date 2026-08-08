"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals } from "@/lib/serialize-decimals";
import { getOfficeGeofenceForUser, isWithinGeofence as checkGeofence } from "@/lib/company/office-geofence";
import { revalidatePath } from "next/cache";

export async function getTodayAttendance() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prismadb.attendance.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
    include: {
      breaks: {
        orderBy: { startTime: "asc" },
      },
    },
  });

  return attendance ? serializeDecimals(attendance) : null;
}

export async function clockInAction(data: {
  lat: number;
  lng: number;
  accuracy: number;
  ip: string;
  deviceFingerprint: string;
  isFakeGps: boolean;
  photoUrl?: string;
  mode: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Office geofence from company branch settings
  const office = await getOfficeGeofenceForUser(session.user.id);
  const withinGeofence = checkGeofence(data.lat, data.lng, office);

  // Enforce geofencing if office mode is requested
  if (data.mode === "office" && !withinGeofence) {
    throw new Error(
      `You are outside the permitted office geofence (${office.branchName ?? "office"}, ${office.radiusMeters}m radius).`
    );
  }

  const attendance = await prismadb.attendance.create({
    data: {
      userId: session.user.id,
      date: today,
      clockIn: new Date(),
      clockInIp: data.ip,
      clockInLocation: {
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
      },
      clockInDevice: data.deviceFingerprint,
      clockInPhoto: data.photoUrl,
      mode: data.mode,
      isFakeGps: data.isFakeGps || data.accuracy === 0,
      status: new Date().getHours() >= 10 ? "late" : "present",
    },
  });

  await prismadb.workSession.updateMany({
    where: { userId: session.user.id, endedAt: null },
    data: { endedAt: new Date() },
  });
  await prismadb.workSession.create({
    data: {
      userId: session.user.id,
      attendanceId: attendance.id,
      activityLabel: "General work",
    },
  });

  revalidatePath("/attendance");
  return serializeDecimals(attendance);
}

export async function clockOutAction(data: {
  lat: number;
  lng: number;
  accuracy: number;
  ip: string;
  deviceFingerprint: string;
  isFakeGps: boolean;
  photoUrl?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prismadb.attendance.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
  });

  if (!existing) throw new Error("No clock-in record found for today.");

  const attendance = await prismadb.attendance.update({
    where: { id: existing.id },
    data: {
      clockOut: new Date(),
      clockOutIp: data.ip,
      clockOutLocation: {
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
      },
      clockOutDevice: data.deviceFingerprint,
      clockOutPhoto: data.photoUrl,
      isFakeGps: existing.isFakeGps || data.isFakeGps || data.accuracy === 0,
    },
  });

  await prismadb.workSession.updateMany({
    where: { userId: session.user.id, endedAt: null },
    data: { endedAt: new Date() },
  });

  revalidatePath("/attendance");
  return serializeDecimals(attendance);
}

export async function startBreakAction(attendanceId: string, reason?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const breakLog = await prismadb.breakLog.create({
    data: {
      attendanceId,
      startTime: new Date(),
      reason,
    },
  });

  revalidatePath("/attendance");
  return serializeDecimals(breakLog);
}

export async function endBreakAction(breakId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const breakLog = await prismadb.breakLog.update({
    where: { id: breakId },
    data: {
      endTime: new Date(),
    },
  });

  revalidatePath("/attendance");
  return serializeDecimals(breakLog);
}
