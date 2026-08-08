/**
 * Payment gateway provider abstraction (Razorpay, Cashfree, Stripe, etc.)
 */

export interface PaymentLinkRequest {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  description?: string;
  publicToken: string;
}

export interface PaymentLinkResult {
  success: boolean;
  paymentUrl?: string;
  providerReference?: string;
  error?: string;
}

export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResult>;
  verifyPayment(reference: string): Promise<{ success: boolean; amount?: number; error?: string }>;
}

export class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = "unconfigured";

  isConfigured(): boolean {
    return false;
  }

  async createPaymentLink(): Promise<PaymentLinkResult> {
    return {
      success: false,
      error: "Payment gateway is not configured. Configure in Settings → Payments.",
    };
  }

  async verifyPayment(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "Payment gateway is not configured." };
  }
}

let activeProvider: PaymentProvider = new UnconfiguredPaymentProvider();

export function getPaymentProvider(): PaymentProvider {
  return activeProvider;
}

export function setPaymentProvider(provider: PaymentProvider): void {
  activeProvider = provider;
}

export function buildPublicInvoiceUrl(publicToken: string, baseUrl?: string): string {
  const base = baseUrl || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base.replace(/\/$/, "")}/invoice/${publicToken}`;
}
