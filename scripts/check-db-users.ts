import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.DATABASE_URL!;
console.log("DATABASE_URL host:", url.replace(/:[^:@]+@/, ":****@"));

const pool = new Pool({ connectionString: url });

async function main() {
  const users = await pool.query(
    `SELECT id, email, role, "userStatus", "emailVerified" FROM "Users" LIMIT 20`
  );
  console.log("Users count:", users.rows.length);
  console.table(users.rows);

  const accounts = await pool.query(
    `SELECT "userId", "accountId", "providerId", (password IS NOT NULL) as has_password FROM account`
  );
  console.log("Accounts count:", accounts.rows.length);
  console.table(accounts.rows);
}

main()
  .catch((e) => {
    console.error("DB error:", e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
