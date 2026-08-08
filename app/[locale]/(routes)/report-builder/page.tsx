"use client";

import React, { useState, useCallback } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Save } from "lucide-react";
import { saveDashboardLayout } from "../admin-dashboard/actions/ceo-actions";
import { toast } from "sonner";

const WIDGET_TYPES = [
  { type: "revenue_chart", label: "Monthly Revenue", w: 6, h: 2 },
  { type: "employee_performance", label: "Employee Performance", w: 6, h: 2 },
  { type: "attendance_summary", label: "Attendance Summary", w: 4, h: 1 },
  { type: "open_tasks", label: "Open Tasks", w: 4, h: 1 },
  { type: "pending_invoices", label: "Pending Invoices", w: 4, h: 1 },
  { type: "sales_pipeline", label: "Sales Pipeline", w: 6, h: 2 },
  { type: "payroll_summary", label: "Payroll Summary", w: 6, h: 2 },
  { type: "gst_compilation", label: "GST Compilation", w: 6, h: 2 },
];

interface Widget {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function ReportBuilderPage() {
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "1", type: "revenue_chart", label: "Monthly Revenue", x: 0, y: 0, w: 6, h: 2 },
    { id: "2", type: "employee_performance", label: "Employee Performance", x: 6, y: 0, w: 6, h: 2 },
  ]);
  const [dragId, setDragId] = useState<string | null>(null);

  const addWidget = (wt: typeof WIDGET_TYPES[number]) => {
    setWidgets([
      ...widgets,
      {
        id: crypto.randomUUID(),
        type: wt.type,
        label: wt.label,
        x: 0,
        y: widgets.length,
        w: wt.w,
        h: wt.h,
      },
    ]);
  };

  const onDragStart = (id: string) => setDragId(id);

  const onDrop = useCallback(
    (targetId: string) => {
      if (!dragId || dragId === targetId) return;
      const fromIdx = widgets.findIndex((w) => w.id === dragId);
      const toIdx = widgets.findIndex((w) => w.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const copy = [...widgets];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      setWidgets(copy.map((w, i) => ({ ...w, y: i })));
      setDragId(null);
    },
    [dragId, widgets]
  );

  const handleSave = async () => {
    try {
      await saveDashboardLayout({
        name: "Custom Report Dashboard",
        type: "custom",
        widgets,
        isDefault: true,
      });
      toast.success("Dashboard layout saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    }
  };

  return (
    <Container
      title="Report Builder"
      description="Drag and drop widgets to build custom executive dashboards"
    >
      <div className="flex gap-2 mb-4 flex-wrap">
        {WIDGET_TYPES.map((wt) => (
          <Button key={wt.type} variant="outline" size="sm" onClick={() => addWidget(wt)}>
            <Plus className="h-3 w-3 mr-1" />
            {wt.label}
          </Button>
        ))}
        <Button onClick={handleSave} className="ml-auto">
          <Save className="h-4 w-4 mr-1" /> Save Layout
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {widgets.map((w) => (
          <Card
            key={w.id}
            className="cursor-grab active:cursor-grabbing"
            style={{ gridColumn: `span ${w.w}` }}
            draggable
            onDragStart={() => onDragStart(w.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(w.id)}
          >
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                {w.label}
                <Badge variant="outline" className="ml-auto text-xs">{w.type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="h-16 bg-muted/50 rounded flex items-center justify-center text-muted-foreground text-sm">
                Widget preview — connects to live data when saved
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
