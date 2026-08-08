"use server";

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { calculateGstLineItem, calculateGstTotals, splitGstRate } from "@/lib/invoices/gst-calculator";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const gstLineItemSchema = z.object({
  description: z.string().min(1),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).max(100).default(18),
  unit: z.string().optional(),
});

const createGstInvoiceSchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(["INVOICE", "PROFORMA", "QUOTATION", "PURCHASE_ORDER", "CREDIT_NOTE"]),
  customerGstin: z.string().optional(),
  supplierGstin: z.string().optional(),
  placeOfSupply: z.string().optional(),
  isInterState: z.boolean().default(false),
  dueDate: z.coerce.date().optional(),
  publicNotes: z.string().optional(),
  lineItems: z.array(gstLineItemSchema).min(1),
});

export async function getGstInvoices() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const invoices = await prismadb.invoices.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      account: { select: { id: true, name: true, vat: true } },
      gstMeta: true,
      lineItems: { orderBy: { position: "asc" } },
    },
  });

  return serializeDecimalsList(invoices);
}

export async function getGstClients() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const accounts = await prismadb.crm_Accounts.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      vat: true,
      email: true,
      billing_city: true,
      billing_state: true,
      invoices: { select: { id: true, grandTotal: true, balanceDue: true, status: true } },
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return serializeDecimalsList(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      gstin: a.vat,
      email: a.email,
      city: a.billing_city,
      state: a.billing_state,
      outstanding: a.invoices.reduce((s, i) => s + Number(i.balanceDue ?? 0), 0),
      totalInvoices: a.invoices.length,
    }))
  );
}

export async function createGstInvoice(raw: unknown) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }

  const input = createGstInvoiceSchema.parse(raw);

  try {
    await assertCanWriteAccount(user, input.accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  const settings = await prismadb.invoice_Settings.findFirst();
  const supplierState = input.placeOfSupply?.slice(0, 2) ?? "27";

  const computedLines = input.lineItems.map((item, i) => {
    const gstSplit = input.isInterState
      ? { cgst: 0, sgst: 0, igst: item.gstRate }
      : splitGstRate(item.gstRate, supplierState, supplierState);

    const computed = calculateGstLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      cgst: gstSplit.cgst,
      sgst: gstSplit.sgst,
      igst: gstSplit.igst,
    });

    return { item, computed, gstSplit, position: i };
  });

  const totals = calculateGstTotals(computedLines.map((l) => l.computed));

  const currencyCode = await prismadb.currency.findUnique({ where: { code: "INR" } })
    ? "INR"
    : settings?.baseCurrency ?? "USD";

  const invoice = await prismadb.invoices.create({
    data: {
      type: input.type,
      status: "DRAFT",
      createdBy: user.id,
      accountId: input.accountId,
      currency: currencyCode,
      dueDate: input.dueDate ?? null,
      publicNotes: input.publicNotes ?? null,
      subtotal: totals.subtotal,
      discountTotal: 0,
      vatTotal: totals.totalCgst + totals.totalSgst + totals.totalIgst,
      grandTotal: totals.grandTotal,
      balanceDue: totals.grandTotal,
      lineItems: {
        create: computedLines.map(({ item, computed, gstSplit, position }) => ({
          position,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          lineSubtotal: computed.lineSubtotal,
          lineVat: computed.cgstAmount + computed.sgstAmount + computed.igstAmount,
          lineTotal: computed.lineTotal,
          hsnCode: item.hsnCode,
          sacCode: item.sacCode,
          unit: item.unit,
          cgst: gstSplit.cgst,
          sgst: gstSplit.sgst,
          igst: gstSplit.igst,
          cgstAmount: computed.cgstAmount,
          sgstAmount: computed.sgstAmount,
          igstAmount: computed.igstAmount,
        })),
      },
      gstMeta: {
        create: {
          placeOfSupply: input.placeOfSupply,
          supplierGstin: input.supplierGstin ?? settings?.companyTaxId,
          customerGstin: input.customerGstin,
          invoiceType: input.isInterState ? "B2B_IGST" : "B2B",
          totalCgst: totals.totalCgst,
          totalSgst: totals.totalSgst,
          totalIgst: totals.totalIgst,
        },
      },
      activity: { create: { actorId: user.id, action: "CREATED_GST" } },
    },
    include: { gstMeta: true, account: true, lineItems: true },
  });

  revalidatePath("/invoicing");
  revalidatePath("/invoices");
  return serializeDecimals(invoice);
}

export async function getGstSummary() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const invoices = await prismadb.invoices.findMany({
    where: { issueDate: { gte: startOfMonth }, gstMeta: { isNot: null } },
    include: { gstMeta: true },
  });

  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let grandTotal = 0;

  for (const inv of invoices) {
    if (inv.gstMeta) {
      totalCgst += Number(inv.gstMeta.totalCgst ?? 0);
      totalSgst += Number(inv.gstMeta.totalSgst ?? 0);
      totalIgst += Number(inv.gstMeta.totalIgst ?? 0);
    }
    grandTotal += Number(inv.grandTotal);
  }

  return { totalCgst, totalSgst, totalIgst, grandTotal, invoiceCount: invoices.length };
}
