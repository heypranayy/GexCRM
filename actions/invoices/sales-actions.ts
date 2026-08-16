"use server";

import { prismadb } from "@/lib/prisma";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import {
  calculateGstLineItem,
  calculateGstTotals,
  splitGstRate,
} from "@/lib/invoices/gst-calculator";
import {
  buildBusinessSnapshot,
  buildCustomerSnapshot,
  generatePublicToken,
} from "@/lib/invoices/snapshot";
import { getActiveCompany, getActiveCompanyId } from "@/lib/company/context";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Invoice_Status, Invoice_Type, Prisma } from "@prisma/client";

const gstLineItemSchema = z.object({
  description: z.string().min(1),
  productId: z.string().uuid().optional().nullable(),
  hsnCode: z.string().optional().nullable(),
  sacCode: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  unit: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).max(100).default(18),
  cess: z.number().min(0).max(100).default(0),
});

const createSalesDocumentSchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(["INVOICE", "PROFORMA", "QUOTATION", "PURCHASE_ORDER", "CREDIT_NOTE"]),
  customerGstin: z.string().optional().nullable(),
  placeOfSupply: z.string().optional().nullable(),
  supplierStateCode: z.string().optional().nullable(),
  customerStateCode: z.string().optional().nullable(),
  issueDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  poNumber: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  publicNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  taxInclusive: z.boolean().default(false),
  invoiceLevelDiscountPercent: z.number().min(0).max(100).default(0),
  invoiceLevelDiscount: z.number().min(0).default(0),
  roundOff: z.boolean().default(true),
  originalInvoiceId: z.string().uuid().optional().nullable(),
  lineItems: z.array(gstLineItemSchema).min(1),
});

export type SalesInvoiceTab = "all" | "pending" | "paid" | "cancelled" | "drafts";

export type SalesInvoiceFilters = {
  tab?: SalesInvoiceTab;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  paymentMode?: string;
  sortBy?: "amount" | "date" | "number" | "customer" | "status";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function tabToStatuses(tab: SalesInvoiceTab): Invoice_Status[] | undefined {
  switch (tab) {
    case "drafts":
      return ["DRAFT"];
    case "paid":
      return ["PAID"];
    case "cancelled":
      return ["CANCELLED"];
    case "pending":
      return ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"];
    default:
      return undefined;
  }
}

async function requireFinancePermission(action: string) {
  const user = await requireAuthenticated();
  const allowed =
    user.role === "admin" ||
    (await hasPermission(user.id, "finance", action));
  if (!allowed) throw new Error("Forbidden - insufficient finance permissions");
  return user;
}

export async function getSalesInvoices(filters: SalesInvoiceFilters = {}) {
  await requireFinancePermission("read");

  const companyId = await getActiveCompanyId();
  const tab = filters.tab ?? "all";
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const statuses = tabToStatuses(tab);

  const where: Prisma.InvoicesWhereInput = {
    type: { in: ["INVOICE", "PROFORMA", "QUOTATION", "PURCHASE_ORDER"] },
    ...(companyId ? { companyId } : {}),
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(filters.status ? { status: filters.status as Invoice_Status } : {}),
    ...(filters.customerId ? { accountId: filters.customerId } : {}),
    ...(filters.paymentMode ? { lastPaymentMode: filters.paymentMode } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          issueDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { number: { contains: filters.search, mode: "insensitive" } },
            { referenceNumber: { contains: filters.search, mode: "insensitive" } },
            { account: { name: { contains: filters.search, mode: "insensitive" } } },
            { account: { email: { contains: filters.search, mode: "insensitive" } } },
            { account: { vat: { contains: filters.search, mode: "insensitive" } } },
            { account: { office_phone: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.InvoicesOrderByWithRelationInput =
    filters.sortBy === "amount"
      ? { grandTotal: filters.sortDir ?? "desc" }
      : filters.sortBy === "customer"
        ? { account: { name: filters.sortDir ?? "asc" } }
        : filters.sortBy === "number"
          ? { number: filters.sortDir ?? "desc" }
          : filters.sortBy === "status"
            ? { status: filters.sortDir ?? "asc" }
            : { issueDate: filters.sortDir ?? "desc" };

  const [invoices, total] = await Promise.all([
    prismadb.invoices.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        account: { select: { id: true, name: true, vat: true, email: true } },
        createdByUser: { select: { id: true, name: true } },
        gstMeta: true,
        payments: { orderBy: { paidAt: "desc" }, take: 1 },
      },
    }),
    prismadb.invoices.count({ where }),
  ]);

  return {
    invoices: serializeDecimalsList(invoices),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSalesInvoiceSummary() {
  await requireFinancePermission("read");
  const companyId = await getActiveCompanyId();

  const baseWhere: Prisma.InvoicesWhereInput = {
    type: "INVOICE",
    ...(companyId ? { companyId } : {}),
    status: { notIn: ["CANCELLED", "DRAFT"] },
  };

  const invoices = await prismadb.invoices.findMany({
    where: baseWhere,
    select: {
      grandTotal: true,
      paidTotal: true,
      balanceDue: true,
      status: true,
    },
  });

  let totalSales = 0;
  let paid = 0;
  let pending = 0;
  let overdue = 0;

  for (const inv of invoices) {
    const gt = Number(inv.grandTotal);
    const pt = Number(inv.paidTotal);
    const bd = Number(inv.balanceDue);
    totalSales += gt;
    paid += pt;
    if (inv.status === "OVERDUE") overdue += bd;
    else if (inv.status !== "PAID") pending += bd;
  }

  return { totalSales, paid, pending, overdue };
}

export async function getSalesCustomers() {
  await requireFinancePermission("read");
  const accounts = await prismadb.crm_Accounts.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      vat: true,
      email: true,
      office_phone: true,
      billing_city: true,
      billing_state: true,
      billing_street: true,
      billing_postal_code: true,
      billing_country: true,
      shipping_street: true,
      shipping_city: true,
      shipping_state: true,
      shipping_postal_code: true,
      shipping_country: true,
      company_id: true,
    },
    orderBy: { name: "asc" },
    take: 500,
  });
  return serializeDecimalsList(accounts);
}

export async function getSalesProducts() {
  await requireFinancePermission("read");
  const products = await prismadb.crm_Products.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      unit_price: true,
      sku: true,
    },
    orderBy: { name: "asc" },
    take: 500,
  });
  return serializeDecimalsList(products);
}

export async function createSalesDocument(raw: unknown) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }

  const allowed =
    user.role === "admin" || (await hasPermission(user.id, "finance", "create"));
  if (!allowed) throw new Error("Forbidden");

  const input = createSalesDocumentSchema.parse(raw);

  try {
    await assertCanWriteAccount(user, input.accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  const company = await getActiveCompany();
  const companyId = company?.id ?? null;
  const settings = companyId
    ? await prismadb.invoice_Settings.findFirst({ where: { companyId } })
    : await prismadb.invoice_Settings.findFirst();

  const supplierState =
    input.supplierStateCode ?? company?.stateCode ?? settings?.gstStateCode ?? "27";
  const customerState = input.customerStateCode ?? input.placeOfSupply?.slice(0, 2) ?? supplierState;
  const isInterState = supplierState !== customerState;

  const computedLines = input.lineItems.map((item, i) => {
    const gstSplit = isInterState
      ? { cgst: 0, sgst: 0, igst: item.gstRate }
      : splitGstRate(item.gstRate, supplierState, customerState);

    const computed = calculateGstLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      cgst: gstSplit.cgst,
      sgst: gstSplit.sgst,
      igst: gstSplit.igst,
      cess: item.cess,
      taxInclusive: input.taxInclusive,
    });

    return { item, computed, gstSplit, position: i };
  });

  const totals = calculateGstTotals(
    computedLines.map((l) => l.computed),
    {
      invoiceDiscountPercent: input.invoiceLevelDiscountPercent,
      invoiceDiscountAmount: input.invoiceLevelDiscount,
      roundOff: input.roundOff,
    },
  );

  const currencyCode = company?.defaultCurrency ?? settings?.baseCurrency ?? "INR";
  const account = await prismadb.crm_Accounts.findUniqueOrThrow({
    where: { id: input.accountId },
  });

  const businessSnapshot = company
    ? buildBusinessSnapshot(company, settings)
    : null;
  const billingSnapshot = buildCustomerSnapshot(
    account,
    input.placeOfSupply ?? customerState,
  );

  const invoice = await prismadb.invoices.create({
    data: {
      type: input.type as Invoice_Type,
      status: "DRAFT",
      createdBy: user.id,
      accountId: input.accountId,
      companyId,
      currency: currencyCode,
      issueDate: input.issueDate ?? null,
      dueDate: input.dueDate ?? null,
      referenceNumber: input.referenceNumber,
      poNumber: input.poNumber,
      paymentTerms: input.paymentTerms,
      publicNotes: input.publicNotes,
      internalNotes: input.internalNotes,
      termsAndConditions: input.termsAndConditions,
      taxInclusive: input.taxInclusive,
      invoiceLevelDiscount: input.invoiceLevelDiscount,
      invoiceLevelDiscountPercent: input.invoiceLevelDiscountPercent,
      roundOff: totals.roundOff,
      originalInvoiceId: input.originalInvoiceId,
      billingSnapshot: billingSnapshot as unknown as Prisma.InputJsonValue,
      businessSnapshot: businessSnapshot
        ? (businessSnapshot as unknown as Prisma.InputJsonValue)
        : undefined,
      publicToken: generatePublicToken(),
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      vatTotal: totals.totalCgst + totals.totalSgst + totals.totalIgst,
      grandTotal: totals.grandTotal,
      balanceDue: totals.grandTotal,
      lineItems: {
        create: computedLines.map(({ item, computed, gstSplit, position }) => ({
          position,
          productId: item.productId,
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
          cess: item.cess,
          cgstAmount: computed.cgstAmount,
          sgstAmount: computed.sgstAmount,
          igstAmount: computed.igstAmount,
          cessAmount: computed.cessAmount,
        })),
      },
      gstMeta: {
        create: {
          placeOfSupply: input.placeOfSupply ?? customerState,
          supplierGstin: company?.gstin ?? settings?.companyVatId,
          customerGstin: input.customerGstin ?? account.vat,
          invoiceType: isInterState ? "B2B_IGST" : "B2B",
          totalCgst: totals.totalCgst,
          totalSgst: totals.totalSgst,
          totalIgst: totals.totalIgst,
          totalCess: totals.totalCess,
          eInvoiceStatus: "NOT_GENERATED",
        },
      },
      activity: { create: { actorId: user.id, action: "CREATED", meta: { source: "sales" } } },
    },
    include: { gstMeta: true, account: true, lineItems: true },
  });

  revalidatePath("/sales/invoices");
  revalidatePath("/invoices");
  return serializeDecimals(invoice);
}

export async function convertQuotationToInvoice(quotationId: string) {
  const user = await requireFinancePermission("create");

  const quotation = await prismadb.invoices.findUniqueOrThrow({
    where: { id: quotationId, type: "QUOTATION" },
    include: { lineItems: true, gstMeta: true, account: true },
  });

  if (quotation.status === "CANCELLED") {
    throw new Error("Cannot convert cancelled quotation");
  }

  const company = await getActiveCompany();
  const input = {
    accountId: quotation.accountId,
    type: "INVOICE" as const,
    customerGstin: quotation.gstMeta?.customerGstin,
    placeOfSupply: quotation.gstMeta?.placeOfSupply,
    dueDate: quotation.dueDate,
    referenceNumber: quotation.referenceNumber,
    poNumber: quotation.poNumber,
    paymentTerms: quotation.paymentTerms,
    publicNotes: quotation.publicNotes,
    internalNotes: quotation.internalNotes,
    termsAndConditions: quotation.termsAndConditions,
    taxInclusive: quotation.taxInclusive,
    invoiceLevelDiscountPercent: Number(quotation.invoiceLevelDiscountPercent),
    invoiceLevelDiscount: Number(quotation.invoiceLevelDiscount),
    roundOff: true,
    lineItems: quotation.lineItems.map((li) => ({
      description: li.description,
      productId: li.productId,
      hsnCode: li.hsnCode,
      sacCode: li.sacCode,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      unit: li.unit,
      discountPercent: Number(li.discountPercent),
      gstRate: Number(li.cgst ?? 0) + Number(li.sgst ?? 0) + Number(li.igst ?? 0),
      cess: Number(li.cess ?? 0),
    })),
  };

  const invoice = await createSalesDocument(input);

  await prismadb.invoices.update({
    where: { id: (invoice as { id: string }).id },
    data: { convertedFromId: quotationId },
  });

  await prismadb.invoices.update({
    where: { id: quotationId },
    data: {
      activity: {
        create: {
          actorId: user.id,
          action: "CONVERTED_TO_INVOICE",
          meta: { invoiceId: (invoice as { id: string }).id },
        },
      },
    },
  });

  revalidatePath("/sales/invoices");
  revalidatePath("/quotations");
  return invoice;
}

export async function getCreditNotes(filters: SalesInvoiceFilters = {}) {
  await requireFinancePermission("read");
  const companyId = await getActiveCompanyId();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  const where: Prisma.InvoicesWhereInput = {
    type: "CREDIT_NOTE",
    ...(companyId ? { companyId } : {}),
    ...(filters.search
      ? {
          OR: [
            { number: { contains: filters.search, mode: "insensitive" } },
            { account: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prismadb.invoices.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        account: { select: { id: true, name: true } },
        originalInvoice: { select: { id: true, number: true } },
        gstMeta: true,
      },
    }),
    prismadb.invoices.count({ where }),
  ]);

  return {
    invoices: serializeDecimalsList(invoices),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getEInvoices(filters: SalesInvoiceFilters = {}) {
  await requireFinancePermission("read");
  const companyId = await getActiveCompanyId();

  const where: Prisma.InvoicesWhereInput = {
    type: "INVOICE",
    ...(companyId ? { companyId } : {}),
    gstMeta: { isNot: null },
    status: { notIn: ["DRAFT", "CANCELLED"] },
    ...(filters.search
      ? {
          OR: [
            { number: { contains: filters.search, mode: "insensitive" } },
            { gstMeta: { customerGstin: { contains: filters.search, mode: "insensitive" } } },
            { gstMeta: { eInvoiceIrn: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const invoices = await prismadb.invoices.findMany({
    where,
    orderBy: { issueDate: "desc" },
    take: filters.pageSize ?? 50,
    include: {
      account: { select: { id: true, name: true } },
      gstMeta: true,
    },
  });

  return serializeDecimalsList(invoices);
}

export async function getSubscriptions() {
  await requireFinancePermission("read");
  const companyId = await getActiveCompanyId();

  const subs = await prismadb.subscription.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true, email: true } },
    },
  });

  return serializeDecimalsList(subs);
}

export async function getQuotations(filters: SalesInvoiceFilters = {}) {
  await requireFinancePermission("read");
  const companyId = await getActiveCompanyId();

  const where: Prisma.InvoicesWhereInput = {
    type: "QUOTATION",
    ...(companyId ? { companyId } : {}),
    ...(filters.search
      ? {
          OR: [
            { number: { contains: filters.search, mode: "insensitive" } },
            { account: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const invoices = await prismadb.invoices.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.pageSize ?? 50,
    include: {
      account: { select: { id: true, name: true } },
      gstMeta: true,
    },
  });

  return serializeDecimalsList(invoices);
}

export async function getPublicInvoice(publicToken: string) {
  const invoice = await prismadb.invoices.findFirst({
    where: { publicToken },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      gstMeta: true,
    },
  });

  if (!invoice) return null;
  if (invoice.status === "DRAFT") return null;

  return serializeDecimals(invoice);
}
