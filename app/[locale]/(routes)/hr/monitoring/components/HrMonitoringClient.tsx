"use client";

import React, { useEffect, useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMonitoringDashboard } from "@/actions/monitoring/monitoring-actions";
import {
  getPendingLeaveApplications,
  reviewLeaveApplication,
} from "@/actions/leave/leave-actions";

export default function HrMonitoringClient() {
  const [data, setData] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, pending] = await Promise.all([
        getMonitoringDashboard(),
        getPendingLeaveApplications(),
      ]);
      setData(dash);
      setLeaves(pending);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reviewLeave = async (id: string, approve: boolean) => {
    try {
      await reviewLeaveApplication(id, approve);
      toast.success(approve ? "Leave approved" : "Leave rejected");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading) {
    return (
      <Container title="Employee Monitoring" description="Loading...">
        <p className="text-muted-foreground">Loading monitoring data...</p>
      </Container>
    );
  }

  return (
    <Container title="Employee Monitoring" description="Live work sessions, checks, and leave approvals">
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Clocked In Now</p>
            <p className="text-2xl font-bold">{data?.clockedIn?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Sessions</p>
            <p className="text-2xl font-bold">{data?.sessions?.filter((s: any) => !s.endedAt).length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Missed / Update Required</p>
            <p className="text-2xl font-bold text-amber-600">{data?.checks?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {leaves.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Pending Leave Approvals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{l.user?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {l.leaveType?.name} · {Number(l.days)} days · {l.leaveType?.isPaid ? "Paid" : "Unpaid (payroll deduction)"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reviewLeave(l.id, true)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => reviewLeave(l.id, false)}>Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Today&apos;s Work Sessions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.sessions ?? []).map((s: any) => (
              <div key={s.id} className="flex justify-between items-center border-b py-2 text-sm">
                <div>
                  <p className="font-medium">{s.user?.name}</p>
                  <p className="text-muted-foreground">{s.task?.title ?? s.activityLabel ?? "—"}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{s.endedAt ? "Ended" : "Active"}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active {s.activeSeconds}s · Idle {s.idleSeconds}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
