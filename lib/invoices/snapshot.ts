import { randomBytes } from "crypto";

export interface BusinessSnapshot {
  companyName: string;
  legalName?: string | null;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
  logo?: string | null;
}

export interface CustomerSnapshot {
  name: string;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingZip?: string | null;
  billingCountry?: string | null;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZip?: string | null;
  shippingCountry?: string | null;
  placeOfSupply?: string | null;
}

export function generatePublicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildBusinessSnapshot(
  company: {
    name: string;
    legalName?: string | null;
    tradeName?: string | null;
    gstin?: string | null;
    pan?: string | null;
    registeredAddress?: string | null;
    billingAddress?: string | null;
    state?: string | null;
    stateCode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    ifsc?: string | null;
    upiId?: string | null;
    logo?: string | null;
  },
  settings?: {
    companyName?: string | null;
    companyAddress?: string | null;
    companyCity?: string | null;
    companyCountry?: string | null;
    companyVatId?: string | null;
    companyTaxId?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    ifsc?: string | null;
    upiId?: string | null;
    gstStateCode?: string | null;
  } | null,
): BusinessSnapshot {
  return {
    companyName: company.name || settings?.companyName || "",
    legalName: company.legalName,
    tradeName: company.tradeName,
    gstin: company.gstin || settings?.companyVatId,
    pan: company.pan || settings?.companyTaxId,
    address: company.registeredAddress || company.billingAddress || settings?.companyAddress,
    city: settings?.companyCity,
    state: company.state,
    stateCode: company.stateCode || settings?.gstStateCode,
    country: company.country || settings?.companyCountry || "India",
    phone: company.phone,
    email: company.email,
    website: company.website,
    bankName: company.bankName || settings?.bankName,
    bankAccount: company.bankAccount || settings?.bankAccount,
    ifsc: company.ifsc || settings?.ifsc,
    upiId: company.upiId || settings?.upiId,
    logo: company.logo,
  };
}

export function buildCustomerSnapshot(account: {
  name: string;
  vat?: string | null;
  email?: string | null;
  office_phone?: string | null;
  billing_street?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  shipping_street?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  company_id?: string | null;
}, placeOfSupply?: string | null): CustomerSnapshot {
  return {
    name: account.name,
    gstin: account.vat,
    pan: account.company_id,
    email: account.email,
    phone: account.office_phone,
    billingStreet: account.billing_street,
    billingCity: account.billing_city,
    billingState: account.billing_state,
    billingZip: account.billing_postal_code,
    billingCountry: account.billing_country,
    shippingStreet: account.shipping_street,
    shippingCity: account.shipping_city,
    shippingState: account.shipping_state,
    shippingZip: account.shipping_postal_code,
    shippingCountry: account.shipping_country,
    placeOfSupply,
  };
}
