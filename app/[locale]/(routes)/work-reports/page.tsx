"use client";

import React, { useEffect, useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import {
  submitWorkReport,
  getMyWorkReports,
} from "./actions/work-report-actions";
import { toast } from "sonner";

interface TaskEntry {
  title: string;
  hours?: number;
  status?: string;
}

export default function WorkReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState<TaskEntry[]>([{ title: "", hours: 1, status: "done" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMyWorkReports().then(setReports).catch(console.error);
  }, []);

  const addTask = () => setTasks([...tasks, { title: "", hours: 1, status: "done" }]);
  const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast.error("Summary is required");
      return;
    }
    const validTasks = tasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) {
      toast.error("Add at least one task");
      return;
    }
    setLoading(true);
    try {
      const hoursWorked = validTasks.reduce((s, t) => s + (t.hours ?? 0), 0);
      await submitWorkReport({
        date,
        summary,
        tasksDone: validTasks,
        hoursWorked,
      });
      toast.success("Work report submitted");
      setSummary("");
      setTasks([{ title: "", hours: 1, status: "done" }]);
      const updated = await getMyWorkReports();
      setReports(updated);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container title="Work Reports" description="Submit your daily tasks and accomplishments">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submit Daily Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Textarea
              placeholder="Summary of your day..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasks Completed</span>
                <Button variant="outline" size="sm" onClick={addTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tasks.map((task, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Task description"
                    value={task.title}
                    onChange={(e) => {
                      const copy = [...tasks];
                      copy[i].title = e.target.value;
                      setTasks(copy);
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    className="w-20"
                    value={task.hours ?? 1}
                    onChange={(e) => {
                      const copy = [...tasks];
                      copy[i].hours = parseFloat(e.target.value);
                      setTasks(copy);
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeTask(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 && (
              <p className="text-muted-foreground text-sm">No reports yet.</p>
            )}
            {reports.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                  <Badge variant={r.status === "reviewed" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.summary}</p>
                <p className="text-xs">{r.hoursWorked ?? 0} hours logged</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
