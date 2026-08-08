/**
 * One-off script: set admin password for Gexart CRM sign-in.
 * Run: pnpm exec tsx scripts/seed-admin-password.ts
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
import { seedCredentialAccount } from "../lib/auth-seed-credential";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const email = process.env.SEED_ADMIN_EMAIL || "admin@gexart.com";
const password = process.env.SEED_ADMIN_PASSWORD || "Gexart@123456";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.users.upsert({
    where: { email },
    update: { name: "Gexart Admin", userStatus: "ACTIVE", role: "admin", emailVerified: true },
    create: { email, name: "Gexart Admin", userStatus: "ACTIVE", role: "admin", emailVerified: true },
  });
  await seedCredentialAccount(prisma, user.id, email, password);
  console.log(`Admin ready: ${email} / ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
