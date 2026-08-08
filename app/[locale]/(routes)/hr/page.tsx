import { getHrDashboardData } from "./actions/hr-actions";
import HrDashboardClient from "./components/HrDashboardClient";

export default async function HrPage() {
  try {
    const data = await getHrDashboardData();
    return <HrDashboardClient data={data} />;
  } catch {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-semibold">HR Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          You need HR or admin permissions to access this module.
        </p>
      </div>
    );
  }
}
