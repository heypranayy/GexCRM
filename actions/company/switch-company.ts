"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuthenticated } from "@/lib/authz";
import { listUserCompanies } from "@/lib/company/context";
import { COMPANY_COOKIE } from "@/lib/company/context";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

export async function getCompaniesForSwitcher() {
  const user = await requireAuthenticated();
  const companies = await listUserCompanies(user.id);
  return serializeDecimalsList(companies);
}

export async function switchCompany(companyId: string) {
  const user = await requireAuthenticated();
  const companies = await listUserCompanies(user.id);
  const allowed = companies.some((c) => c.id === companyId);
  if (!allowed) throw new Error("Forbidden");

  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
