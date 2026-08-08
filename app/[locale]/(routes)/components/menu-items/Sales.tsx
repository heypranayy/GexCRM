import { Receipt, FileText, RefreshCw, Zap } from "lucide-react";
import { NavItem } from "../nav-main";

interface GetSalesMenuItemProps {
  title: string;
}

export default function getSalesMenuItem({
  title,
}: GetSalesMenuItemProps): NavItem {
  return {
    title,
    url: "/sales/invoices",
    icon: Receipt,
    items: [
      { title: "Invoices", url: "/sales/invoices" },
      { title: "Credit Notes", url: "/sales/credit-notes" },
      { title: "E-Invoices", url: "/sales/e-invoices" },
      { title: "Subscriptions", url: "/sales/subscriptions" },
      { title: "Quotations", url: "/quotations" },
    ],
  };
}
