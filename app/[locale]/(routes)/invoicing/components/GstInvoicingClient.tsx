"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Search, Calculator, Building2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  getGstInvoices,
  getGstClients,
  createGstInvoice,
  getGstSummary,
} from "../actions/gst-invoice-actions";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Tax Invoice",
  PROFORMA: "Proforma",
  QUOTATION: "Quotation",
  PURCHASE_ORDER: "Purchase Order",
  CREDIT_NOTE: "Credit Note",
};

interface BuilderItem {
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstRate: number;
}

export default function GstInvoicingClient() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [gstSummary, setGstSummary] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  const [accountId, setAccountId] = useState("");
  const [docType, setDocType] = useState<string>("INVOICE");
  const [isInterState, setIsInterState] = useState(false);
  const [customerGstin, setCustomerGstin] = useState("");
  const [items, setItems] = useState<BuilderItem[]>([
    { description: "", hsnCode: "998314", quantity: 1, unitPrice: 0, discountPercent: 0, gstRate: 18 },
  ]);

  const load = async () => {
    try {
      const [inv, cli, summary] = await Promise.all([
        getGstInvoices(),
        getGstClients(),
        getGstSummary(),
      ]);
      setInvoices(inv);
      setClients(cli);
      setGstSummary(summary);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load GST data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (i) =>
        i.number?.toLowerCase().includes(q) ||
        i.account?.name?.toLowerCase().includes(q) ||
        i.gstMeta?.customerGstin?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const builderTotal = items.reduce((sum, item) => {
    const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    return sum + base * (1 + item.gstRate / 100);
  }, 0);

  const handleSave = async () => {
    if (!accountId) {
      toast.error("Select a client");
      return;
    }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    try {
      await createGstInvoice({
        accountId,
        type: docType as any,
        customerGstin: customerGstin || undefined,
        isInterState,
        lineItems: validItems,
      });
      toast.success("GST document created");
      setShowBuilder(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create");
    }
  };

  if (loading) {
    return (
      <Container title="GST Invoicing" description="India GST-compliant invoicing">
        <p className="text-muted-foreground">Loading...</p>
      </Container>
    );
  }

  return (
    <Container title="GST Invoicing" description="Connected to real invoices with GST metadata">
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">CGST (MTD)</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatINR(gstSummary?.totalCgst ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">SGST (MTD)</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatINR(gstSummary?.totalSgst ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">IGST (MTD)</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatINR(gstSummary?.totalIgst ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total (MTD)</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatINR(gstSummary?.grandTotal ?? 0)}</p></CardContent>
        </Card>
      </div>

      <div className="flex justify-between mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search invoices, clients, GSTIN..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowBuilder(!showBuilder)}>
          <Plus className="h-4 w-4 mr-2" /> New GST Document
        </Button>
      </div>

      {showBuilder && (
        <Card className="mb-6">
          <CardHeader><CardTitle>GST Document Builder</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={accountId} onValueChange={(v) => {
                  setAccountId(v);
                  const c = clients.find((cl) => cl.id === v);
                  if (c?.gstin) setCustomerGstin(c.gstin);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Tax Invoice</SelectItem>
                    <SelectItem value="PROFORMA">Proforma Invoice</SelectItem>
                    <SelectItem value="QUOTATION">Quotation</SelectItem>
                    <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="27AABCA1234F1ZN" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
              <Label>Inter-state (IGST)</Label>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid md:grid-cols-6 gap-2">
                <Input placeholder="Description" value={item.description} onChange={(e) => {
                  const copy = [...items]; copy[i].description = e.target.value; setItems(copy);
                }} />
                <Input placeholder="HSN" value={item.hsnCode} onChange={(e) => {
                  const copy = [...items]; copy[i].hsnCode = e.target.value; setItems(copy);
                }} />
                <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                  const copy = [...items]; copy[i].quantity = parseFloat(e.target.value) || 0; setItems(copy);
                }} />
                <Input type="number" placeholder="Rate" value={item.unitPrice} onChange={(e) => {
                  const copy = [...items]; copy[i].unitPrice = parseFloat(e.target.value) || 0; setItems(copy);
                }} />
                <Input type="number" placeholder="GST %" value={item.gstRate} onChange={(e) => {
                  const copy = [...items]; copy[i].gstRate = parseFloat(e.target.value) || 0; setItems(copy);
                }} />
                <Button variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>Remove</Button>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setItems([...items, { description: "", hsnCode: "998314", quantity: 1, unitPrice: 0, discountPercent: 0, gstRate: 18 }])}>
                Add Line
              </Button>
              <p className="font-bold">Total: {formatINR(builderTotal)}</p>
            </div>
            <Button onClick={handleSave}>Save as Draft</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" /> Invoices</TabsTrigger>
          <TabsTrigger value="clients"><Building2 className="h-4 w-4 mr-1" /> Clients</TabsTrigger>
          <TabsTrigger value="gst"><Calculator className="h-4 w-4 mr-1" /> GST Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left">Number</th>
                    <th className="p-3 text-left">Client</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-center">GST</th>
                    <th className="p-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/20">
                      <td className="p-3 font-mono">{inv.number ?? "Draft"}</td>
                      <td className="p-3">{inv.account?.name}</td>
                      <td className="p-3"><Badge variant="outline">{TYPE_LABELS[inv.type] ?? inv.type}</Badge></td>
                      <td className="p-3 text-right font-medium">{formatINR(Number(inv.grandTotal))}</td>
                      <td className="p-3"><Badge>{inv.status}</Badge></td>
                      <td className="p-3 text-center text-xs">
                        {inv.gstMeta ? (
                          <span>C:{Number(inv.gstMeta.totalCgst ?? 0)} S:{Number(inv.gstMeta.totalSgst ?? 0)} I:{Number(inv.gstMeta.totalIgst ?? 0)}</span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="p-4 text-muted-foreground text-sm">No invoices found.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {clients.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>GSTIN: {c.gstin ?? "—"}</p>
                  <p>{c.city}, {c.state}</p>
                  <p>Outstanding: {formatINR(Number(c.outstanding))}</p>
                  <p>{c.totalInvoices} invoices</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="gst" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Monthly GST Compilation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p>Invoices this month: {gstSummary?.invoiceCount ?? 0}</p>
              <p>CGST: {formatINR(gstSummary?.totalCgst ?? 0)}</p>
              <p>SGST: {formatINR(gstSummary?.totalSgst ?? 0)}</p>
              <p>IGST: {formatINR(gstSummary?.totalIgst ?? 0)}</p>
              <p className="font-bold">Grand Total: {formatINR(gstSummary?.grandTotal ?? 0)}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
