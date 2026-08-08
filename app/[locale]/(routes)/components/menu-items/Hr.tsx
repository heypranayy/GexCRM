import { Users } from "lucide-react";
import { NavItem } from "../nav-main";

interface GetHrMenuItemProps {
  title: string;
}

export default function getHrMenuItem({ title }: GetHrMenuItemProps): NavItem {
  return {
    title,
    icon: Users,
    items: [
      { title: "HR Dashboard", url: "/hr" },
      { title: "Attendance", url: "/attendance" },
      { title: "Employee Monitoring", url: "/hr/monitoring" },
      { title: "Work Reports", url: "/work-reports" },
      { title: "Task Transfers", url: "/task-transfers" },
    ],
  };
}
