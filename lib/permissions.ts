import { prismadb } from "./prisma";

/**
 * Checks if a user has permission to perform a specific action on a resource.
 * Supports granular actions: read, create, update, delete, approve, assign, export, import.
 * Supports special accesses: financial_access, salary_access, client_access, admin_access.
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  // Master Admin role has complete override bypass
  if (user.role === "admin") return true;

  const matrix = await prismadb.permissionMatrix.findUnique({
    where: {
      role_resource: {
        role: user.role,
        resource,
      },
    },
  });

  if (!matrix) return false;
  return matrix.actions.includes(action);
}

/**
 * Helper to get a user's full organizational context.
 */
export async function getUserOrgContext(userId: string) {
  return await prismadb.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
      branchId: true,
      departmentId: true,
      teamId: true,
      designationId: true,
      company: { select: { name: true } },
      branch: { select: { name: true } },
      department: { select: { name: true } },
      team: { select: { name: true } },
      designation: { select: { name: true } },
    },
  });
}
