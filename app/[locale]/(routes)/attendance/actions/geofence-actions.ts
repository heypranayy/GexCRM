"use server";

import { getSession } from "@/lib/auth-server";
import { getOfficeGeofenceForUser } from "@/lib/company/office-geofence";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getOfficeGeofenceSettings() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  return getOfficeGeofenceForUser(session.user.id);
}

export async function updateBranchGeofence(data: {
  branchId: string;
  officeLat: number;
  officeLng: number;
  geofenceRadiusMeters: number;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  if (session.user.role !== "admin") throw new Error("Forbidden");

  await prismadb.branch.update({
    where: { id: data.branchId },
    data: {
      officeLat: data.officeLat,
      officeLng: data.officeLng,
      geofenceRadiusMeters: data.geofenceRadiusMeters,
    },
  });

  revalidatePath("/attendance");
  return { success: true };
}
