"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals } from "@/lib/serialize-decimals";
import { revalidatePath } from "next/cache";

export async function updateUserSalary(userId: string, baseSalary: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  if (session.user.role !== "admin") throw new Error("Forbidden");

  if (baseSalary < 0) throw new Error("Salary must be non-negative");

  const user = await prismadb.users.update({
    where: { id: userId },
    data: { baseSalary },
  });

  revalidatePath("/admin/users");
  revalidatePath("/hr");
  return serializeDecimals(user);
}
