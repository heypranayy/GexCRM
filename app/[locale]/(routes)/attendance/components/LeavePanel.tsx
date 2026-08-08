"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getLeaveTypes,
  getMyLeaveApplications,
  getMyLeaveBalances,
  applyForLeave,
} from "@/actions/leave/leave-actions";

export default function LeavePanel() {
  const [types, setTypes] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [t, a, b] = await Promise.all([
      getLeaveTypes(),
      getMyLeaveApplications(),
      getMyLeaveBalances(),
    ]);
    setTypes(t);
    setApps(a);
    setBalances(b);
  };

  useEffect(() => { load().catch(console.error); }, []);

  const handleApply = async () => {
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error("Fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await applyForLeave({
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      });
      toast.success("Leave application submitted");
      setReason("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apply for Leave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Leave Type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.isPaid ? "(Paid)" : "(Unpaid — salary deduction)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start</Label>
              <input type="date" className="w-full rounded-md border px-3 py-2 text-sm bg-transparent" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <input type="date" className="w-full rounded-md border px-3 py-2 text-sm bg-transparent" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleApply} disabled={loading} className="w-full">
            Submit for HR Approval
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Leave Balance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {balances.length === 0 ? (
              <p className="text-muted-foreground">No balances configured yet</p>
            ) : balances.map((b) => (
              <div key={b.id} className="flex justify-between border-b py-2">
                <span>{b.leaveType?.name}</span>
                <span>{Number(b.used)}/{Number(b.allocated)} days</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">My Applications</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {apps.map((a) => (
              <div key={a.id} className="flex justify-between border-b py-2">
                <span>{a.leaveType?.name} · {new Date(a.startDate).toLocaleDateString()}</span>
                <span className="capitalize">{a.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
