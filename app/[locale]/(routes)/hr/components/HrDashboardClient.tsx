"use client";

import React, { useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  IndianRupee,
  UserPlus,
  Clock,
  Calculator,
} from "lucide-react";
import {
  calculateMonthlyPayouts,
  approvePayout,
} from "../actions/hr-actions";
import { toast } from "sonner";

interface HrDashboardClientProps {
  data: {
    employees: any[];
    payouts: any[];
    candidates: any[];
    shifts: any[];
    stats: {
      totalEmployees: number;
      presentToday: number;
      absentToday: number;
      openCandidates: number;
    };
  };
}

const statusColor: Record<string, string> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  half_day: "outline",
  on_leave: "outline",
};

export default function HrDashboardClient({ data }: HrDashboardClientProps) {
  const [payouts, setPayouts] = useState(data.payouts);
  const now = new Date();

  const handleCalculatePayroll = async () => {
    try {
      const result = await calculateMonthlyPayouts(now.getMonth() + 1, now.getFullYear());
      setPayouts(result);
      toast.success("Payroll calculated for all employees");
    } catch (err: any) {
      toast.error(err.message ?? "Calculation failed");
    }
  };

  const handleApprove = async (id: string) => {
    await approvePayout(id);
    setPayouts(payouts.map((p) => p.id === id ? { ...p, status: "approved" } : p));
    toast.success("Payout approved");
  };

  return (
    <Container title="HR Dashboard" description="People, attendance, payroll, and hiring">
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.totalEmployees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" /> Present Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{data.stats.presentToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{data.stats.absentToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Open Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.openCandidates}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Today&apos;s Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="hiring">Hiring Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y--2">
                {data.employees.map((e) => (
                  <div key={e.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.department} · {e.designation}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {e.clockIn && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(e.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {e.clockOut && ` – ${new Date(e.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                      )}
                      <Badge variant={statusColor[e.status] as any ?? "outline"}>
                        {e.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" /> Salary & Payroll
              </CardTitle>
              <Button onClick={handleCalculatePayroll}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate This Month
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <p className="font-medium">{p.user?.name ?? "Employee"}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.presentDays}/{p.workingDays} days · Deductions: ₹{Number(p.deductions).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">₹{Number(p.netPay).toLocaleString()}</span>
                      <Badge>{p.status}</Badge>
                      {p.status === "calculated" && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(p.id)}>
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {payouts.length === 0 && (
                  <p className="text-muted-foreground text-sm">No payroll records. Click Calculate to generate.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hiring" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.position} · {c.source}</p>
                    </div>
                    <Badge variant="outline">{c.stage}</Badge>
                  </div>
                ))}
                {data.candidates.length === 0 && (
                  <p className="text-muted-foreground text-sm">No candidates in pipeline.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
