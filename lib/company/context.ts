import { cookies } from "next/headers";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

const COMPANY_COOKIE = "gexart_company_id";

export async function getActiveCompanyId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COMPANY_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  const session = await getSession();
  if (!session) return null;

  const user = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  });
  return user?.companyId ?? null;
}

export async function getActiveCompany() {
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    const first = await prismadb.company.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return first;
  }
  return prismadb.company.findUnique({ where: { id: companyId } });
}

export async function getCompanyInvoiceSettings(companyId: string) {
  return prismadb.invoice_Settings.findFirst({
    where: { companyId },
    include: {
      defaultSeries: true,
      defaultTaxRate: true,
    },
  });
}

export async function listUserCompanies(userId: string) {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { role: true, companyId: true },
  });
  if (!user) return [];

  if (user.role === "admin") {
    return prismadb.company.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  if (user.companyId) {
    const company = await prismadb.company.findUnique({
      where: { id: user.companyId },
    });
    return company ? [company] : [];
  }

  return prismadb.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export { COMPANY_COOKIE };
