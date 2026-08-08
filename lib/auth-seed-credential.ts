import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Creates or updates a better-auth credential account so email/password sign-in works.
 */
export async function seedCredentialAccount(
  prisma: PrismaClient,
  userId: string,
  email: string,
  password: string
) {
  const hashed = await hashPassword(password);

  const existing = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: {
        accountId: email,
        password: hashed,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        userId,
        accountId: email,
        providerId: "credential",
        password: hashed,
      },
    });
  }
}
