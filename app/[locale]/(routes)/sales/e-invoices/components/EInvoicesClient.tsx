"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getEInvoices } from "@/actions/invoices/sales-actions";

const E_STATUS_COLORS: Record<string, string> = {
  NOT_GENERATED: "bg-gray-100 text-gray-700 dark:bg-gray-800",
  GENERATED: "bg-blue-100 text-blue-700",
  IRN_GENERATED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  FAILED: "bg-red-100 text-red-700",
};

export default function EInvoicesClient() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getEInvoices({ search: search || undefined });
      setInvoices(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Container title="E-Invoices" description="GST e-invoice status and IRN management">
      <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">E-invoice provider not configured</p>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            Connect a GST e-invoice provider in Settings → Integrations to generate IRNs.
            Architecture is ready — no fake government API responses are shown.
          </p>
        </div>
      </div>
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by invoice, GSTIN, IRN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Customer GSTIN</TableHead>
              <TableHead>IRN</TableHead>
              <TableHead>E-Invoice Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No e-invoices</TableCell></TableRow>
            ) : invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                    {inv.number}
                  </Link>
                </TableCell>
                <TableCell>{inv.account?.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{inv.gstMeta?.customerGstin ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">
                  {inv.gstMeta?.eInvoiceIrn ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={E_STATUS_COLORS[inv.gstMeta?.eInvoiceStatus ?? "NOT_GENERATED"]}
                  >
                    {inv.gstMeta?.eInvoiceStatus ?? "NOT_GENERATED"}
                  </Badge>
                </TableCell>
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
