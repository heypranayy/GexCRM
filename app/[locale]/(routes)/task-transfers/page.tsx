"use client";

import React, { useEffect, useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import {
  getPendingTransfers,
  approveTaskTransfer,
  rejectTaskTransfer,
} from "../projects/actions/task-transfer-actions";
import { toast } from "sonner";

export default function TaskTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getPendingTransfers();
      setTransfers(data);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    await approveTaskTransfer(id);
    toast.success("Transfer approved");
    load();
  };

  const handleReject = async (id: string) => {
    await rejectTaskTransfer(id);
    toast.success("Transfer rejected");
    load();
  };

  return (
    <Container
      title="Task Transfer Approvals"
      description="Review and approve task reassignment requests"
    >
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests ({transfers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-muted-foreground">Loading...</p>}
          {!loading && transfers.length === 0 && (
            <p className="text-muted-foreground">No pending transfer requests.</p>
          )}
          {transfers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div className="space-y-1">
                <p className="font-medium">{t.task?.title ?? "Task"}</p>
                <p className="text-sm text-muted-foreground">
                  {t.fromUser?.name} → {t.toUser?.name}
                </p>
                {t.reason && (
                  <p className="text-sm italic">{t.reason}</p>
                )}
                <Badge variant="outline">{t.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(t.id)}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(t.id)}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
