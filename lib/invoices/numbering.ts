import type { Prisma, PrismaClient } from "@prisma/client";
import { getFinancialYearLabel, formatDocumentNumber } from "./financial-year";

export function formatNumber(template: string, year: number, counter: number): string {
  return template
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{(#+)\}/g, (_, hashes: string) =>
      String(counter).padStart(hashes.length, "0"),
    );
}

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function consumeNextNumber(
  tx: TxClient,
  seriesId: string,
  now: Date = new Date(),
): Promise<{ number: string; seriesId: string }> {
  const series = await tx.invoice_Series.findUniqueOrThrow({ where: { id: seriesId } });
  const year = now.getUTCFullYear();
  let counter = series.counter;
  if (series.resetPolicy === "YEARLY" && series.currentYear !== year) {
    counter = 0;
  }
  counter += 1;
  await tx.invoice_Series.update({
    where: { id: seriesId },
    data: { counter, currentYear: year },
  });
  return { number: formatNumber(series.prefixTemplate, year, counter), seriesId };
}

export async function consumeDocumentNumber(
  tx: TxClient,
  companyId: string,
  documentType: string,
  branchId?: string | null,
  now: Date = new Date(),
): Promise<string> {
  const fy = getFinancialYearLabel(now);
  const settings = await tx.documentSettings.findFirst({
    where: {
      companyId,
      documentType,
      branchId: branchId ?? null,
    },
  });

  if (!settings) {
    throw new Error(`Document numbering not configured for ${documentType}`);
  }

  const series = await tx.invoice_Series.findFirst({
    where: {
      companyId,
      documentType,
      branchId: branchId ?? undefined,
      active: true,
    },
    orderBy: { isDefault: "desc" },
  });

  if (series) {
    const { number } = await consumeNextNumber(tx, series.id, now);
    return number;
  }

  const counter = settings.startingNumber;
  await tx.documentSettings.update({
    where: { id: settings.id },
    data: { startingNumber: counter + 1, financialYear: fy },
  });

  return formatDocumentNumber(
    settings.formatTemplate,
    settings.prefix,
    counter,
    fy,
  );
}
