"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/app/[locale]/(routes)/invoices/components/status-badge";
import {
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Copy,
  CreditCard,
  XCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSalesInvoices,
  getSalesInvoiceSummary,
  type SalesInvoiceTab,
} from "@/actions/invoices/sales-actions";
import { duplicateInvoice } from "@/actions/invoices/duplicate-invoice";
import { cancelInvoice } from "@/actions/invoices/cancel-invoice";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const DATE_FILTERS = [
  { value: "this_year", label: "This Year" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_year", label: "Last Year" },
] as const;

function getDateRange(filter: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

  switch (filter) {
    case "today":
      return {
        dateFrom: startOfDay(now).toISOString(),
        dateTo: endOfDay(now).toISOString(),
      };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { dateFrom: startOfDay(y).toISOString(), dateTo: endOfDay(y).toISOString() };
    }
    case "this_month":
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        dateTo: endOfDay(now).toISOString(),
      };
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: start.toISOString(), dateTo: endOfDay(end).toISOString() };
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        dateFrom: new Date(now.getFullYear(), q * 3, 1).toISOString(),
        dateTo: endOfDay(now).toISOString(),
      };
    }
    case "last_year":
      return {
        dateFrom: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
        dateTo: new Date(now.getFullYear() - 1, 11, 31).toISOString(),
      };
    default:
      return {
        dateFrom: new Date(now.getFullYear(), 0, 1).toISOString(),
        dateTo: endOfDay(now).toISOString(),
      };
  }
}

export default function SalesInvoicesClient() {
  const [tab, setTab] = useState<SalesInvoiceTab>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("this_year");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "number" | "customer" | "status">("date");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalSales: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDateRange(dateFilter);
      const [list, sum] = await Promise.all([
        getSalesInvoices({
          tab,
          search: search || undefined,
          ...range,
          sortBy,
          sortDir: "desc",
          page,
          pageSize: 25,
        }),
        getSalesInvoiceSummary(),
      ]);
      setInvoices(list.invoices);
      setTotalPages(list.totalPages);
      setSummary(sum);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [tab, search, dateFilter, sortBy, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateInvoice(id);
      toast.success("Invoice duplicated");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelInvoice(id);
      toast.success("Invoice cancelled");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  return (
    <Container
      title="Sales"
      description="Manage tax invoices, payments, and GST billing"
    >
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold tracking-tight">{formatINR(summary.totalSales)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
                {formatINR(summary.paid)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {formatINR(summary.pending)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {formatINR(summary.overdue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as SalesInvoiceTab); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/invoices/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Document Settings
              </Button>
            </Link>
            <Link href="/sales/invoices/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction, customers, invoice etc."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="number">Bill #</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => load()}>Apply</Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Bill #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No invoices found</p>
                    <Link href="/sales/invoices/new">
                      <Button className="mt-4" size="sm">Create first invoice</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {formatINR(Number(inv.grandTotal))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {inv.lastPaymentMode ?? inv.payments?.[0]?.method ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.number ?? "Draft"}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.account?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {inv.issueDate
                        ? new Date(inv.issueDate).toLocaleDateString("en-IN")
                        : new Date(inv.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {inv.createdByUser?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${inv.id}`}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </Link>
                          </DropdownMenuItem>
                          {inv.status === "DRAFT" && (
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/${inv.id}/edit`}>
                                <FileText className="h-4 w-4 mr-2" /> Edit Draft
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(inv.id)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          {inv.pdfStorageKey && (
                            <DropdownMenuItem asChild>
                              <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                              </a>
                            </DropdownMenuItem>
                          )}
                          {inv.status !== "PAID" && inv.status !== "CANCELLED" && inv.status !== "DRAFT" && (
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/${inv.id}?action=payment`}>
                                <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {inv.status !== "CANCELLED" && inv.status !== "DRAFT" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleCancel(inv.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {inv.status === "DRAFT" && (
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Draft
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination + footer summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>Total {formatINR(summary.totalSales)}</span>
            <span>Paid {formatINR(summary.paid)}</span>
            <span>Pending {formatINR(summary.pending)}</span>
            <span>Overdue {formatINR(summary.overdue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
