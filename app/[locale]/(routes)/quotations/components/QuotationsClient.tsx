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
import { Plus, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getQuotations, convertQuotationToInvoice } from "@/actions/invoices/sales-actions";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

export default function QuotationsClient() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getQuotations({ search: search || undefined });
      setQuotations(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleConvert = async (id: string) => {
    try {
      const invoice = await convertQuotationToInvoice(id);
      toast.success("Quotation converted to invoice");
      window.location.href = `/invoices/${(invoice as { id: string }).id}`;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <Container title="Quotations" description="Sales quotations and proposals">
      <div className="flex justify-between mb-4 gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <Link href="/sales/invoices/new?type=QUOTATION">
          <Button><Plus className="h-4 w-4 mr-2" /> Create Quotation</Button>
        </Link>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : quotations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quotations</TableCell></TableRow>
            ) : quotations.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Link href={`/invoices/${q.id}`} className="font-medium hover:underline">
                    {q.number ?? "Draft"}
                  </Link>
                </TableCell>
                <TableCell>{q.account?.name}</TableCell>
                <TableCell className="font-medium">{formatINR(Number(q.grandTotal))}</TableCell>
                <TableCell><StatusBadge status={q.status} /></TableCell>
                <TableCell>
                  {q.issueDate ? new Date(q.issueDate).toLocaleDateString("en-IN") : new Date(q.createdAt).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell>
                  {q.type === "QUOTATION" && q.status !== "CANCELLED" && (
                    <Button variant="outline" size="sm" onClick={() => handleConvert(q.id)}>
                      <ArrowRight className="h-4 w-4 mr-1" /> Convert to Invoice
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Container>
  );
}
