"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  createSalesDocument,
  getSalesCustomers,
  getSalesProducts,
} from "@/actions/invoices/sales-actions";
import { GST_RATES } from "@/lib/invoices/financial-year";
import {
  calculateGstLineItem,
  calculateGstTotals,
  splitGstRate,
} from "@/lib/invoices/gst-calculator";

interface LineItem {
  description: string;
  productId?: string;
  hsnCode: string;
  sacCode: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  discountPercent: number;
  gstRate: number;
  cess: number;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

export default function InvoiceCreateClient() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27");
  const [supplierStateCode, setSupplierStateCode] = useState("27");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [publicNotes, setPublicNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState(0);

  const [items, setItems] = useState<LineItem[]>([
    {
      description: "",
      hsnCode: "",
      sacCode: "998314",
      quantity: 1,
      unitPrice: 0,
      unit: "pcs",
      discountPercent: 0,
      gstRate: 18,
      cess: 0,
    },
  ]);

  useEffect(() => {
    getSalesCustomers().then(setCustomers).catch(() => {});
    getSalesProducts().then(setProducts).catch(() => {});
  }, []);

  const selectedCustomer = customers.find((c) => c.id === accountId);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerGstin(selectedCustomer.vat ?? "");
      if (selectedCustomer.billing_state) {
        setPlaceOfSupply(selectedCustomer.billing_state.slice(0, 2));
      }
    }
  }, [selectedCustomer]);

  const isInterState = supplierStateCode !== placeOfSupply.slice(0, 2);

  const computed = useMemo(() => {
    const lines = items.map((item) => {
      const gstSplit = isInterState
        ? { cgst: 0, sgst: 0, igst: item.gstRate }
        : splitGstRate(item.gstRate, supplierStateCode, placeOfSupply.slice(0, 2));

      const result = calculateGstLineItem({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        cgst: gstSplit.cgst,
        sgst: gstSplit.sgst,
        igst: gstSplit.igst,
        cess: item.cess,
        taxInclusive,
      });
      return result;
    });

    return calculateGstTotals(lines, {
      invoiceDiscountPercent: invoiceDiscountPercent,
      roundOff: true,
    });
  }, [items, isInterState, supplierStateCode, placeOfSupply, taxInclusive, invoiceDiscountPercent]);

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "",
        hsnCode: "",
        sacCode: "998314",
        quantity: 1,
        unitPrice: 0,
        unit: "pcs",
        discountPercent: 0,
        gstRate: 18,
        cess: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const selectProduct = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateItem(idx, {
      productId,
      description: product.name,
      unitPrice: Number(product.price ?? 0),
    });
  };

  const handleSubmit = async (asDraft = true) => {
    if (!accountId) {
      toast.error("Select a customer");
      return;
    }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    setLoading(true);
    try {
      const invoice = await createSalesDocument({
        accountId,
        type: "INVOICE",
        customerGstin: customerGstin || null,
        placeOfSupply,
        supplierStateCode,
        customerStateCode: placeOfSupply.slice(0, 2),
        issueDate: issueDate ? new Date(issueDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        referenceNumber: referenceNumber || null,
        poNumber: poNumber || null,
        paymentTerms: paymentTerms || null,
        publicNotes: publicNotes || null,
        termsAndConditions: termsAndConditions || null,
        taxInclusive,
        invoiceLevelDiscountPercent: invoiceDiscountPercent,
        roundOff: true,
        lineItems: validItems,
      });

      toast.success(asDraft ? "Invoice draft created" : "Invoice created");
      router.push(`/invoices/${(invoice as { id: string }).id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container title="Create Invoice" description="GST tax invoice with live calculation">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Customer</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
              </div>
              <div>
                <Label>Place of Supply</Label>
                <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
              </div>
              {selectedCustomer && (
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  {selectedCustomer.billing_street && <p>{selectedCustomer.billing_street}</p>}
                  <p>
                    {[selectedCustomer.billing_city, selectedCustomer.billing_state, selectedCustomer.billing_postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Invoice Date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Reference #</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </div>
              <div>
                <Label>PO Number</Label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Payment Terms</Label>
                <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30" />
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="grid gap-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Product / Service</Label>
                      <Select
                        value={item.productId ?? ""}
                        onValueChange={(v) => selectProduct(idx, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type below" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <Label>HSN/SAC</Label>
                      <Input
                        value={item.hsnCode || item.sacCode}
                        onChange={(e) => updateItem(idx, { sacCode: e.target.value, hsnCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                    </div>
                    <div>
                      <Label>Rate</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Discount %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) => updateItem(idx, { discountPercent: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>GST %</Label>
                      <Select
                        value={String(item.gstRate)}
                        onValueChange={(v) => updateItem(idx, { gstRate: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => (
                            <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6 grid gap-4">
              <div>
                <Label>Notes</Label>
                <Textarea value={publicNotes} onChange={(e) => setPublicNotes(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Totals sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                GST Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax Inclusive</span>
                <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Type</span>
                <span className="font-medium">{isInterState ? "IGST" : "CGST + SGST"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(computed.subtotal)}</span>
              </div>
              {computed.discountTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatINR(computed.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatINR(computed.totalCgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatINR(computed.totalSgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatINR(computed.totalIgst)}</span>
              </div>
              {computed.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Round Off</span>
                  <span>{formatINR(computed.roundOff)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 font-bold text-base">
                <span>Grand Total</span>
                <span>{formatINR(computed.grandTotal)}</span>
              </div>
              <div>
                <Label>Invoice Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={invoiceDiscountPercent}
                  onChange={(e) => setInvoiceDiscountPercent(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" disabled={loading} onClick={() => handleSubmit(true)}>
            Save as Draft
          </Button>
          <Button className="w-full" variant="outline" disabled={loading} onClick={() => handleSubmit(false)}>
            Save Invoice
          </Button>
        </div>
      </div>
    </Container>
  );
}
