import { LayoutDashboard } from "lucide-react";
import { NavItem } from "../nav-main";

interface GetCeoMenuItemProps {
  title: string;
}

export default function getCeoMenuItem({ title }: GetCeoMenuItemProps): NavItem {
  return {
    title,
    icon: LayoutDashboard,
    items: [
      { title: "CEO Dashboard", url: "/admin-dashboard" },
      { title: "Project Dashboard", url: "/project-dashboard" },
      { title: "GST Invoicing", url: "/sales/invoices" },
      { title: "Report Builder", url: "/report-builder" },
    ],
  };
}
