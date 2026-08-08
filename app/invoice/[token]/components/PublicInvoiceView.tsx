"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer } from "lucide-react";
import { StatusBadge } from "@/app/[locale]/(routes)/invoices/components/status-badge";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

interface PublicInvoiceViewProps {
  invoice: any;
}

export default function PublicInvoiceView({ invoice }: PublicInvoiceViewProps) {
  const billing = invoice.billingSnapshot as Record<string, string> | null;
  const business = invoice.businessSnapshot as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">
                  {business?.companyName ?? "Invoice"}
                </CardTitle>
                {business?.gstin && (
                  <p className="text-sm text-muted-foreground mt-1">GSTIN: {business.gstin}</p>
                )}
              </div>
              <StatusBadge status={invoice.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Bill To</p>
                <p className="font-semibold">{billing?.name ?? "Customer"}</p>
                {billing?.gstin && <p className="text-sm text-muted-foreground">GSTIN: {billing.gstin}</p>}
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm"><span className="text-muted-foreground">Invoice #</span> {invoice.number}</p>
                {invoice.issueDate && (
                  <p className="text-sm"><span className="text-muted-foreground">Date</span> {new Date(invoice.issueDate).toLocaleDateString("en-IN")}</p>
                )}
                {invoice.dueDate && (
                  <p className="text-sm"><span className="text-muted-foreground">Due</span> {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Item</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems?.map((li: any) => (
                    <tr key={li.id} className="border-t">
                      <td className="p-3">{li.description}</td>
                      <td className="p-3 text-right">{Number(li.quantity)}</td>
                      <td className="p-3 text-right">{formatINR(Number(li.unitPrice))}</td>
                      <td className="p-3 text-right font-medium">{formatINR(Number(li.lineTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invoice.gstMeta && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div><span className="text-muted-foreground">CGST</span> {formatINR(Number(invoice.gstMeta.totalCgst ?? 0))}</div>
                <div><span className="text-muted-foreground">SGST</span> {formatINR(Number(invoice.gstMeta.totalSgst ?? 0))}</div>
                <div><span className="text-muted-foreground">IGST</span> {formatINR(Number(invoice.gstMeta.totalIgst ?? 0))}</div>
              </div>
            )}

            <div className="flex justify-between items-center border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-2xl font-bold">{formatINR(Number(invoice.balanceDue))}</p>
                {Number(invoice.paidTotal) > 0 && (
                  <p className="text-sm text-green-600">Paid: {formatINR(Number(invoice.paidTotal))}</p>
                )}
              </div>
              <div className="flex gap-2">
                {invoice.pdfStorageKey && (
                  <Button variant="outline" asChild>
                    <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" /> PDF
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              </div>
            </div>

            {invoice.publicNotes && (
              <p className="text-sm text-muted-foreground border-t pt-4">{invoice.publicNotes}</p>
            )}

            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              <Badge variant="outline" className="mb-2">Pay Now</Badge>
              <p>Online payment gateway not configured. Contact the business to arrange payment.</p>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Powered by Gexart CRM</p>
      </div>
    </div>
  );
}
