"use server";

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { getActiveCompanyId } from "@/lib/company/context";
import { getFinancialYearLabel } from "@/lib/invoices/financial-year";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateDocSettingsSchema = z.object({
  documentType: z.enum(["INVOICE", "QUOTATION", "PROFORMA", "CREDIT_NOTE", "PURCHASE_ORDER"]),
  prefix: z.string().min(1).max(20),
  startingNumber: z.number().int().min(1),
  formatTemplate: z.string().min(1),
});

export async function getDocumentSettings() {
  const user = await requireAuthenticated();
  const allowed =
    user.role === "admin" || (await hasPermission(user.id, "finance", "read"));
  if (!allowed) throw new Error("Forbidden");

  const companyId = await getActiveCompanyId();
  if (!companyId) throw new Error("No company selected");

  const settings = await prismadb.documentSettings.findMany({
    where: { companyId },
    orderBy: { documentType: "asc" },
  });

  const invoiceSettings = await prismadb.invoice_Settings.findFirst({
    where: { companyId },
    include: { defaultSeries: true },
  });

  return serializeDecimals({
    documentSettings: settings,
    invoiceSettings,
    financialYear: getFinancialYearLabel(),
  });
}

export async function updateDocumentSettings(raw: unknown) {
  const user = await requireAuthenticated();
  const allowed =
    user.role === "admin" || (await hasPermission(user.id, "finance", "update"));
  if (!allowed) throw new Error("Forbidden");

  const input = updateDocSettingsSchema.parse(raw);
  const companyId = await getActiveCompanyId();
  if (!companyId) throw new Error("No company selected");

  const existing = await prismadb.documentSettings.findFirst({
    where: { companyId, documentType: input.documentType, branchId: null },
  });

  const fy = getFinancialYearLabel();

  if (existing) {
    const updated = await prismadb.documentSettings.update({
      where: { id: existing.id },
      data: {
        prefix: input.prefix,
        startingNumber: input.startingNumber,
        formatTemplate: input.formatTemplate,
        financialYear: fy,
      },
    });
    revalidatePath("/admin/invoices/settings");
    revalidatePath("/sales/invoices");
    return serializeDecimals(updated);
  }

  const created = await prismadb.documentSettings.create({
    data: {
      companyId,
      documentType: input.documentType,
      prefix: input.prefix,
      startingNumber: input.startingNumber,
      formatTemplate: input.formatTemplate,
      financialYear: fy,
    },
  });

  revalidatePath("/admin/invoices/settings");
  revalidatePath("/sales/invoices");
  return serializeDecimals(created);
}

export async function listDocumentSeries() {
  const user = await requireAuthenticated();
  const companyId = await getActiveCompanyId();

  const series = await prismadb.invoice_Series.findMany({
    where: companyId ? { companyId, active: true } : { active: true },
    orderBy: { documentType: "asc" },
  });

  return serializeDecimalsList(series);
}
