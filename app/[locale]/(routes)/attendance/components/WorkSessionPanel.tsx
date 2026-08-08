"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getActiveWorkSession,
  getMyAssignedTasks,
  startWorkSession,
  updateWorkSessionTask,
  endWorkSession,
} from "@/actions/monitoring/monitoring-actions";
import Link from "next/link";

export default function WorkSessionPanel() {
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskId, setTaskId] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([getActiveWorkSession(), getMyAssignedTasks()]);
    setSession(s);
    setTasks(t);
    if (s?.taskId) setTaskId(s.taskId);
  };

  useEffect(() => { load().catch(console.error); }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startWorkSession({ taskId: taskId || undefined });
      toast.success("Work session started");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      await updateWorkSessionTask(taskId);
      toast.success("Task updated");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setLoading(true);
    try {
      await endWorkSession();
      toast.success("Work session ended");
      setSession(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Work Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select your active task while clocked in. Random productivity checks may appear via browser notification.
          </p>
          <div>
            <Label>Task</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
              <SelectContent>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!session ? (
            <Button onClick={handleStart} disabled={loading} className="w-full">
              Start Work Session
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                Active: <strong>{session.task?.title ?? "General work"}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Since {new Date(session.startedAt).toLocaleTimeString()}
              </p>
              <Button variant="outline" onClick={handleUpdateTask} disabled={loading || !taskId}>
                Switch Task
              </Button>
              <Button variant="destructive" onClick={handleEnd} disabled={loading} className="w-full">
                End Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Monitoring Policy</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Random work checks between 5 minutes and 5 hours while clocked in</p>
          <p>• Acknowledge quickly or submit a work update</p>
          <p>• After 3 missed checks, a work update is required</p>
          <p>• Activity metrics (active/idle time) are aggregated — no keylogging</p>
          <Link href="/hr/monitoring" className="text-primary hover:underline text-sm">
            HR: view team monitoring →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
