/**
 * Indian financial year utilities (April–March).
 * FY 2026-27 runs from 1 Apr 2026 to 31 Mar 2027.
 */

export function getFinancialYearLabel(
  date: Date = new Date(),
  startMonth = 4,
): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= startMonth) {
    const endYear = (year + 1).toString().slice(-2);
    return `${year.toString().slice(-2)}-${endYear}`;
  }
  const endYear = year.toString().slice(-2);
  return `${(year - 1).toString().slice(-2)}-${endYear}`;
}

export function formatDocumentNumber(
  template: string,
  prefix: string,
  number: number,
  fy: string,
): string {
  return template
    .replace(/\{prefix\}/g, prefix)
    .replace(/\{number\}/g, String(number))
    .replace(/\{fy\}/g, fy)
    .replace(/\{(#+)\}/g, (_, hashes: string) =>
      String(number).padStart(hashes.length, "0"),
    )
    .replace(/\{YYYY\}/g, String(new Date().getFullYear()));
}

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export type GstRate = typeof GST_RATES[number];

export const PAYMENT_MODES = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Card",
  "Other",
] as const;

export type PaymentMode = typeof PAYMENT_MODES[number];

export const E_INVOICE_STATUSES = [
  "NOT_GENERATED",
  "GENERATED",
  "IRN_GENERATED",
  "CANCELLED",
  "FAILED",
] as const;

export const PDF_TEMPLATES = ["classic", "modern", "minimal", "professional"] as const;

export type PdfTemplate = typeof PDF_TEMPLATES[number];
