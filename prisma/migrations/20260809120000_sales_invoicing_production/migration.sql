-- Sales invoicing production schema

-- Company extensions
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "tradeName" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "cin" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "registeredAddress" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stateCode" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'India';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "ifsc" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "upiId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "invoicePrefix" TEXT DEFAULT 'GX';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "quotationPrefix" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "proformaPrefix" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "creditNotePrefix" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "defaultCurrency" VARCHAR(3) DEFAULT 'INR';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "financialYearStart" INTEGER DEFAULT 4;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- Branch extensions
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "stateCode" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "ifsc" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "upiId" TEXT;

-- Invoices extensions
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "companyId" UUID;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "salespersonId" UUID;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "invoiceLevelDiscount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "invoiceLevelDiscountPercent" DECIMAL(5,2) DEFAULT 0;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "roundOff" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "taxInclusive" BOOLEAN DEFAULT false;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "businessSnapshot" JSONB;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "convertedFromId" UUID;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "pdfTemplate" TEXT DEFAULT 'classic';
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "lastPaymentMode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Invoices_publicToken_key" ON "Invoices"("publicToken");
CREATE INDEX IF NOT EXISTS "Invoices_companyId_idx" ON "Invoices"("companyId");
CREATE INDEX IF NOT EXISTS "Invoices_branchId_idx" ON "Invoices"("branchId");

ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_convertedFromId_fkey" FOREIGN KEY ("convertedFromId") REFERENCES "Invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invoice_GstMeta e-invoice fields
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "eInvoiceStatus" TEXT DEFAULT 'NOT_GENERATED';
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "ackNumber" TEXT;
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "ackDate" TIMESTAMP(3);
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "signedInvoice" TEXT;
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "signedQr" TEXT;
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "cancellationStatus" TEXT;
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "Invoice_GstMeta" ADD COLUMN IF NOT EXISTS "cancellationDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Invoice_GstMeta_eInvoiceStatus_idx" ON "Invoice_GstMeta"("eInvoiceStatus");

-- Invoice_Series extensions
ALTER TABLE "Invoice_Series" ADD COLUMN IF NOT EXISTS "companyId" UUID;
ALTER TABLE "Invoice_Series" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "Invoice_Series" ADD COLUMN IF NOT EXISTS "documentType" TEXT DEFAULT 'INVOICE';
ALTER TABLE "Invoice_Series" ADD COLUMN IF NOT EXISTS "financialYear" TEXT;

CREATE INDEX IF NOT EXISTS "Invoice_Series_companyId_idx" ON "Invoice_Series"("companyId");
CREATE INDEX IF NOT EXISTS "Invoice_Series_documentType_idx" ON "Invoice_Series"("documentType");

ALTER TABLE "Invoice_Series" ADD CONSTRAINT "Invoice_Series_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice_Series" ADD CONSTRAINT "Invoice_Series_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invoice_Settings extensions
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "companyId" UUID;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "ifsc" TEXT;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "upiId" TEXT;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "gstStateCode" TEXT;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "defaultPdfTemplate" TEXT DEFAULT 'classic';
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "quotationSeriesId" UUID;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "proformaSeriesId" UUID;
ALTER TABLE "Invoice_Settings" ADD COLUMN IF NOT EXISTS "creditNoteSeriesId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_Settings_companyId_key" ON "Invoice_Settings"("companyId");
ALTER TABLE "Invoice_Settings" ADD CONSTRAINT "Invoice_Settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DocumentSettings
CREATE TABLE IF NOT EXISTS "DocumentSettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "documentType" TEXT NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT 'GX',
  "startingNumber" INTEGER NOT NULL DEFAULT 1,
  "formatTemplate" TEXT NOT NULL DEFAULT '{prefix}/{number}/{fy}',
  "financialYear" TEXT,
  "branchId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSettings_companyId_documentType_branchId_key" ON "DocumentSettings"("companyId", "documentType", "branchId");
CREATE INDEX IF NOT EXISTS "DocumentSettings_companyId_idx" ON "DocumentSettings"("companyId");

ALTER TABLE "DocumentSettings" ADD CONSTRAINT "DocumentSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSettings" ADD CONSTRAINT "DocumentSettings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID,
  "accountId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "customDays" INTEGER,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "nextInvoiceDate" DATE,
  "autoInvoice" BOOLEAN NOT NULL DEFAULT true,
  "autoPayment" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "gstRate" DECIMAL(5,2),
  "hsnCode" TEXT,
  "sacCode" TEXT,
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Subscription_accountId_idx" ON "Subscription"("accountId");
CREATE INDEX IF NOT EXISTS "Subscription_companyId_idx" ON "Subscription"("companyId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_nextInvoiceDate_idx" ON "Subscription"("nextInvoiceDate");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "crm_Accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
