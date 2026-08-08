"use client";

import React, { useEffect, useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderKanban,
  Target,
  IndianRupee,
  FileText,
  CheckSquare,
  Clock,
} from "lucide-react";
import { getCeoDashboardMetrics } from "./actions/ceo-actions";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCeoDashboardMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Container title="CEO Dashboard" description="Executive overview">
        <p className="text-muted-foreground">Loading metrics...</p>
      </Container>
    );
  }

  if (!metrics) {
    return (
      <Container title="CEO Dashboard" description="Executive overview">
        <p className="text-muted-foreground">Unable to load dashboard. Admin access required.</p>
      </Container>
    );
  }

  const s = metrics.stats;

  const kpiCards = [
    { label: "Employees", value: s.totalEmployees, icon: Users },
    { label: "Active Projects", value: s.activeProjects, icon: FolderKanban },
    { label: "Open Opportunities", value: s.openOpportunities, icon: Target },
    { label: "Monthly Revenue", value: `₹${s.monthlyRevenue.toLocaleString()}`, icon: IndianRupee },
    { label: "Collected (MTD)", value: `₹${s.monthlyCollected.toLocaleString()}`, icon: IndianRupee },
    { label: "Yearly Revenue", value: `₹${s.yearlyRevenue.toLocaleString()}`, icon: IndianRupee },
    { label: "Pending Invoices", value: s.pendingInvoices, icon: FileText },
    { label: "Open Tasks", value: s.openTasks, icon: CheckSquare },
    { label: "Today Attendance", value: s.todayAttendance, icon: Clock },
    { label: "Pending Transfers", value: s.pendingTransfers, icon: CheckSquare },
  ];

  return (
    <Container title="CEO Dashboard" description="Real-time executive overview across all modules">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <kpi.icon className="h-4 w-4" />
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recentAudit.map((log: any) => (
              <div key={log.id} className="flex items-start justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">{log.user}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.action} · {log.entity}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
            {metrics.recentAudit.length === 0 && (
              <p className="text-muted-foreground text-sm">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.monthlyRevenueChart.length === 0 ? (
              <p className="text-muted-foreground text-sm">No revenue data yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.monthlyRevenueChart.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</span>
                    <span className="font-medium">₹{Number(r.revenue).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
