import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { seedCredentialAccount } from "@/lib/auth-seed-credential";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gexart.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Gexart@123456";

/**
 * Dev-only: ensures admin@gexart.com exists with password login.
 * GET http://localhost:3001/api/dev/ensure-admin
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const user = await prismadb.users.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        name: "Gexart Admin",
        userStatus: "ACTIVE",
        role: "admin",
        emailVerified: true,
      },
      create: {
        email: ADMIN_EMAIL,
        name: "Gexart Admin",
        userStatus: "ACTIVE",
        role: "admin",
        emailVerified: true,
      },
    });

    await seedCredentialAccount(prismadb, user.id, ADMIN_EMAIL, ADMIN_PASSWORD);

    return NextResponse.json({
      ok: true,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      message: "Admin account ready. Restart dev server if login still fails (auth secret changed).",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
