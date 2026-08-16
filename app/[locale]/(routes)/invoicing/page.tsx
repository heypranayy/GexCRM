import { redirect } from "next/navigation";

export default function InvoicingRedirectPage() {
  redirect("/sales/invoices");
}
