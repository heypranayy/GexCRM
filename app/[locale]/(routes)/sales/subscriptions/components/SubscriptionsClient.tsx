"use client";

import React, { useEffect, useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getSubscriptions } from "@/actions/invoices/sales-actions";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-red-100 text-red-700",
};

export default function SubscriptionsClient() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubscriptions()
      .then(setSubs)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container title="Subscriptions" description="Recurring billing and retainer management">
      <div className="flex justify-end mb-4">
        <Button disabled title="Create via admin — subscription creation UI coming in settings">
          <Plus className="h-4 w-4 mr-2" /> New Subscription
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Invoice</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : subs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No subscriptions yet</TableCell></TableRow>
            ) : subs.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.account?.name}</TableCell>
                <TableCell>{formatINR(Number(s.amount))}</TableCell>
                <TableCell>{s.frequency}</TableCell>
                <TableCell>
                  {s.nextInvoiceDate
                    ? new Date(s.nextInvoiceDate).toLocaleDateString("en-IN")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_COLORS[s.status] ?? ""}>
                    {s.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Container>
  );
}
