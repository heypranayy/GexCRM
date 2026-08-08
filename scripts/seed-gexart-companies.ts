/**
 * Seed Gexart companies, document settings, and invoice series.
 * Run: npx tsx scripts/seed-gexart-companies.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getFinancialYearLabel } from "../lib/invoices/financial-year";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const COMPANIES = [
  { name: "Gexart Digital", tradeName: "Gexart Digital", invoicePrefix: "GD" },
  { name: "Gexart Technologies", tradeName: "Gexart Technologies", invoicePrefix: "GT" },
  { name: "Gexart Labs", tradeName: "Gexart Labs", invoicePrefix: "GL" },
];

const DOC_TYPES = ["INVOICE", "QUOTATION", "PROFORMA", "CREDIT_NOTE", "PURCHASE_ORDER"];

async function main() {
  const fy = getFinancialYearLabel();
  const inr = await prisma.currency.findUnique({ where: { code: "INR" } });

  for (const c of COMPANIES) {
    const existing = await prisma.company.findFirst({ where: { name: c.name } });
    const company =
      existing ??
      (await prisma.company.create({
        data: {
          name: c.name,
          tradeName: c.tradeName,
          invoicePrefix: c.invoicePrefix,
          defaultCurrency: "INR",
          country: "India",
          isActive: true,
        },
      }));

    for (const docType of DOC_TYPES) {
      const prefix = c.invoicePrefix;
      const existingDoc = await prisma.documentSettings.findFirst({
        where: { companyId: company.id, documentType: docType, branchId: null },
      });
      if (!existingDoc) {
        await prisma.documentSettings.create({
          data: {
            companyId: company.id,
            documentType: docType,
            prefix,
            startingNumber: 1,
            formatTemplate: "{prefix}/{number}/{fy}",
            financialYear: fy,
          },
        });
      } else {
        await prisma.documentSettings.update({
          where: { id: existingDoc.id },
          data: { financialYear: fy },
        });
      }

      const seriesName = `${c.name} ${docType}`;
      const existingSeries = await prisma.invoice_Series.findFirst({
        where: { companyId: company.id, documentType: docType },
      });
      if (!existingSeries) {
        await prisma.invoice_Series.create({
          data: {
            name: seriesName,
            prefixTemplate: `${prefix}/{#}/{${fy}}`,
            companyId: company.id,
            documentType: docType,
            financialYear: fy,
            isDefault: docType === "INVOICE",
            active: true,
          },
        });
      }
    }

    const defaultSeries = await prisma.invoice_Series.findFirst({
      where: { companyId: company.id, documentType: "INVOICE", isDefault: true },
    });

    const existingSettings = await prisma.invoice_Settings.findFirst({
      where: { companyId: company.id },
    });

    if (!existingSettings) {
      await prisma.invoice_Settings.create({
        data: {
          companyId: company.id,
          baseCurrency: inr ? "INR" : "USD",
          defaultSeriesId: defaultSeries?.id,
          defaultDueDays: 30,
          companyName: c.name,
          defaultPdfTemplate: "classic",
          gstStateCode: "27",
        },
      });
    }
  }

  console.log("Seeded Gexart companies:", COMPANIES.map((c) => c.name).join(", "));

  const leaveDefaults = [
    { name: "Paid Leave", code: "PAID", isPaid: true, maxDays: 12 },
    { name: "Unpaid Leave", code: "UNPAID", isPaid: false },
    { name: "Sick Leave", code: "SICK", isPaid: true, maxDays: 6 },
    { name: "Casual Leave", code: "CASUAL", isPaid: true, maxDays: 6 },
  ];

  for (const c of COMPANIES) {
    const company = await prisma.company.findFirst({ where: { name: c.name } });
    if (!company) continue;

    for (const d of leaveDefaults) {
      const ex = await prisma.leaveType.findFirst({
        where: { companyId: company.id, code: d.code },
      });
      if (!ex) {
        await prisma.leaveType.create({ data: { ...d, companyId: company.id } });
      }
    }

    const mp = await prisma.monitoringPolicy.findUnique({ where: { companyId: company.id } });
    if (!mp) {
      await prisma.monitoringPolicy.create({
        data: {
          companyId: company.id,
          enabled: true,
          minIntervalMinutes: 5,
          maxIntervalMinutes: 300,
          maxMissedBeforeWarning: 3,
          gracePeriodSeconds: 120,
        },
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
