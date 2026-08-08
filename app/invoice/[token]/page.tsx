import { notFound } from "next/navigation";
import { getPublicInvoice } from "@/actions/invoices/sales-actions";
import PublicInvoiceView from "./components/PublicInvoiceView";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await getPublicInvoice(token);

  if (!invoice) {
    notFound();
  }

  return <PublicInvoiceView invoice={invoice} />;
}
