import Decimal from "decimal.js";

export interface GstLineItemInput {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  taxInclusive?: boolean;
}

export interface GstLineItemResult {
  lineSubtotal: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  lineTotal: number;
}

export interface GstTotals {
  subtotal: number;
  discountTotal: number;
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  grandTotal: number;
  roundOff: number;
}

/**
 * Calculate GST for a single line item (India GST compliance).
 * Supports tax-inclusive and tax-exclusive pricing.
 */
export function calculateGstLineItem(item: GstLineItemInput): GstLineItemResult {
  const qty = new Decimal(item.quantity);
  const price = new Decimal(item.unitPrice);
  const discount = new Decimal(item.discountPercent ?? 0).div(100);

  const gross = qty.times(price);
  const afterDiscount = gross.minus(gross.times(discount));

  const cgstRate = new Decimal(item.cgst ?? 0).div(100);
  const sgstRate = new Decimal(item.sgst ?? 0).div(100);
  const igstRate = new Decimal(item.igst ?? 0).div(100);
  const cessRate = new Decimal(item.cess ?? 0).div(100);
  const totalTaxRate = cgstRate.plus(sgstRate).plus(igstRate).plus(cessRate);

  let taxableValue: Decimal;
  let lineSubtotal: Decimal;

  if (item.taxInclusive && totalTaxRate.gt(0)) {
    taxableValue = afterDiscount.div(totalTaxRate.plus(1));
    lineSubtotal = taxableValue;
  } else {
    lineSubtotal = afterDiscount;
    taxableValue = afterDiscount;
  }

  const cgstAmount = taxableValue.times(cgstRate);
  const sgstAmount = taxableValue.times(sgstRate);
  const igstAmount = taxableValue.times(igstRate);
  const cessAmount = taxableValue.times(cessRate);

  const lineTotal = item.taxInclusive
    ? afterDiscount
    : taxableValue.plus(cgstAmount).plus(sgstAmount).plus(igstAmount).plus(cessAmount);

  return {
    lineSubtotal: lineSubtotal.toDecimalPlaces(2).toNumber(),
    taxableValue: taxableValue.toDecimalPlaces(2).toNumber(),
    cgstAmount: cgstAmount.toDecimalPlaces(2).toNumber(),
    sgstAmount: sgstAmount.toDecimalPlaces(2).toNumber(),
    igstAmount: igstAmount.toDecimalPlaces(2).toNumber(),
    cessAmount: cessAmount.toDecimalPlaces(2).toNumber(),
    lineTotal: lineTotal.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Aggregate GST totals from line items with optional invoice-level discount and round-off.
 */
export function calculateGstTotals(
  items: GstLineItemResult[],
  options?: {
    invoiceDiscountPercent?: number;
    invoiceDiscountAmount?: number;
    roundOff?: boolean;
  },
): GstTotals {
  let subtotal = new Decimal(0);
  let taxableValue = new Decimal(0);
  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalIgst = new Decimal(0);
  let totalCess = new Decimal(0);

  for (const item of items) {
    subtotal = subtotal.plus(item.lineSubtotal);
    taxableValue = taxableValue.plus(item.taxableValue ?? item.lineSubtotal);
    totalCgst = totalCgst.plus(item.cgstAmount);
    totalSgst = totalSgst.plus(item.sgstAmount);
    totalIgst = totalIgst.plus(item.igstAmount);
    totalCess = totalCess.plus(item.cessAmount);
  }

  let discountTotal = new Decimal(0);
  if (options?.invoiceDiscountAmount) {
    discountTotal = new Decimal(options.invoiceDiscountAmount);
  } else if (options?.invoiceDiscountPercent) {
    discountTotal = taxableValue.times(options.invoiceDiscountPercent).div(100);
  }

  taxableValue = taxableValue.minus(discountTotal);
  const taxRatio = subtotal.gt(0) ? taxableValue.div(subtotal) : new Decimal(1);
  totalCgst = totalCgst.times(taxRatio);
  totalSgst = totalSgst.times(taxRatio);
  totalIgst = totalIgst.times(taxRatio);
  totalCess = totalCess.times(taxRatio);

  let grandTotal = taxableValue
    .plus(totalCgst)
    .plus(totalSgst)
    .plus(totalIgst)
    .plus(totalCess);

  let roundOff = new Decimal(0);
  if (options?.roundOff) {
    const rounded = grandTotal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    roundOff = rounded.minus(grandTotal);
    grandTotal = rounded;
  }

  return {
    subtotal: subtotal.toDecimalPlaces(2).toNumber(),
    discountTotal: discountTotal.toDecimalPlaces(2).toNumber(),
    taxableValue: taxableValue.toDecimalPlaces(2).toNumber(),
    totalCgst: totalCgst.toDecimalPlaces(2).toNumber(),
    totalSgst: totalSgst.toDecimalPlaces(2).toNumber(),
    totalIgst: totalIgst.toDecimalPlaces(2).toNumber(),
    totalCess: totalCess.toDecimalPlaces(2).toNumber(),
    grandTotal: grandTotal.toDecimalPlaces(2).toNumber(),
    roundOff: roundOff.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Determine CGST/SGST vs IGST based on place of supply.
 */
export function splitGstRate(
  taxRate: number,
  supplierState: string,
  customerState: string
): { cgst: number; sgst: number; igst: number } {
  if (supplierState === customerState) {
    const half = taxRate / 2;
    return { cgst: half, sgst: half, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: taxRate };
}
