"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/app/[locale]/(routes)/invoices/components/status-badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { getCreditNotes } from "@/actions/invoices/sales-actions";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

export default function CreditNotesClient() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCreditNotes({ search: search || undefined });
      setInvoices(data.invoices);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Container title="Credit Notes" description="Manage credit notes against invoices">
      <div className="flex justify-between mb-4 gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search credit notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <Link href="/sales/invoices/new?type=CREDIT_NOTE">
          <Button><Plus className="h-4 w-4 mr-2" /> Create Credit Note</Button>
        </Link>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credit Note #</TableHead>
              <TableHead>Original Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No credit notes</TableCell></TableRow>
            ) : invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                    {inv.number ?? "Draft"}
                  </Link>
                </TableCell>
                <TableCell>
                  {inv.originalInvoice?.number
                    ? <Link href={`/invoices/${inv.originalInvoice.id}`}>{inv.originalInvoice.number}</Link>
                    : "—"}
                </TableCell>
                <TableCell>{inv.account?.name}</TableCell>
                <TableCell className="font-medium">{formatINR(Number(inv.grandTotal))}</TableCell>
                <TableCell><StatusBadge status={inv.status} /></TableCell>
                <TableCell>
                  {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("en-IN") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Container>
  );
}
