/**
 * GST E-Invoice provider abstraction.
 * Integrate Cleartax, IRIS, Masters India, etc. without coupling core invoice logic.
 */

export type EInvoiceStatus =
  | "NOT_GENERATED"
  | "GENERATED"
  | "IRN_GENERATED"
  | "CANCELLED"
  | "FAILED";

export interface EInvoicePayload {
  invoiceId: string;
  invoiceNumber: string;
  supplierGstin: string;
  customerGstin?: string | null;
  placeOfSupply: string;
  issueDate: string;
  documentType: string;
  totalValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  lineItems: Array<{
    description: string;
    hsnCode?: string | null;
    sacCode?: string | null;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
  }>;
}

export interface EInvoiceResult {
  success: boolean;
  status: EInvoiceStatus;
  irn?: string;
  ackNumber?: string;
  ackDate?: Date;
  signedInvoice?: string;
  signedQr?: string;
  qrCode?: string;
  error?: string;
}

export interface EInvoiceProvider {
  readonly name: string;
  isConfigured(): boolean;
  generate(payload: EInvoicePayload): Promise<EInvoiceResult>;
  cancel(irn: string, reason: string): Promise<EInvoiceResult>;
}

export class UnconfiguredEInvoiceProvider implements EInvoiceProvider {
  readonly name = "unconfigured";

  isConfigured(): boolean {
    return false;
  }

  async generate(): Promise<EInvoiceResult> {
    return {
      success: false,
      status: "NOT_GENERATED",
      error: "E-invoice provider is not configured. Configure in Settings → Integrations.",
    };
  }

  async cancel(): Promise<EInvoiceResult> {
    return {
      success: false,
      status: "FAILED",
      error: "E-invoice provider is not configured.",
    };
  }
}

let activeProvider: EInvoiceProvider = new UnconfiguredEInvoiceProvider();

export function getEInvoiceProvider(): EInvoiceProvider {
  return activeProvider;
}

export function setEInvoiceProvider(provider: EInvoiceProvider): void {
  activeProvider = provider;
}
