import { prismadb } from "@/lib/prisma";

/** Default office location — Mumbai HQ (Gexart India) */
export const DEFAULT_OFFICE = {
  lat: 19.076,
  lng: 72.8777,
  radiusMeters: 200,
};

export interface OfficeGeofence {
  lat: number;
  lng: number;
  radiusMeters: number;
  branchName?: string;
}

/**
 * Resolve office geofence for a user from their branch, or fall back to company default branch.
 */
export async function getOfficeGeofenceForUser(userId: string): Promise<OfficeGeofence> {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: {
      branchId: true,
      branch: {
        select: {
          name: true,
          officeLat: true,
          officeLng: true,
          geofenceRadiusMeters: true,
        },
      },
      companyId: true,
    },
  });

  if (user?.branch?.officeLat != null && user.branch.officeLng != null) {
    return {
      lat: Number(user.branch.officeLat),
      lng: Number(user.branch.officeLng),
      radiusMeters: user.branch.geofenceRadiusMeters ?? DEFAULT_OFFICE.radiusMeters,
      branchName: user.branch.name,
    };
  }

  // Fall back to first branch of user's company
  if (user?.companyId) {
    const branch = await prismadb.branch.findFirst({
      where: { companyId: user.companyId, officeLat: { not: null }, officeLng: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    if (branch?.officeLat != null && branch.officeLng != null) {
      return {
        lat: Number(branch.officeLat),
        lng: Number(branch.officeLng),
        radiusMeters: branch.geofenceRadiusMeters ?? DEFAULT_OFFICE.radiusMeters,
        branchName: branch.name,
      };
    }
  }

  return { ...DEFAULT_OFFICE };
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinGeofence(
  userLat: number,
  userLng: number,
  office: OfficeGeofence
): boolean {
  return haversineDistanceMeters(userLat, userLng, office.lat, office.lng) <= office.radiusMeters;
}
