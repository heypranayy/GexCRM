import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "admin@gexart.com";
const TEST_USER_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD || "Gexart@123456";

setup("authenticate", async ({ page, context }) => {
  const api = context.request;

  // Seed creates admin@gexart.com with password; ensure-admin is idempotent in dev/CI.
  await api.get("/api/dev/ensure-admin");

  const signInRes = await api.post("/api/auth/sign-in/email", {
    data: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    },
  });
  expect(signInRes.ok()).toBeTruthy();

  await page.goto("/en");
  await page.waitForURL(
    (url) =>
      /^\/(en|cs|de|uk)(\/|$)/.test(url.pathname) &&
      !url.pathname.includes("sign-in"),
    { timeout: 15000 },
  );

  await context.storageState({ path: authFile });
});
