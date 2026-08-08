"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  pollWorkCheck,
  respondToWorkCheck,
  reportActivityPulse,
} from "@/actions/monitoring/monitoring-actions";

/**
 * Global randomized work-check listener.
 * Polls server every 60s; server decides random trigger timing.
 * No fixed client-side interval for checks — only polling.
 */
export function RandomCheckProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [mode, setMode] = useState<"quick_check" | "work_update_required">("quick_check");
  const [message, setMessage] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [workInProgress, setWorkInProgress] = useState("");
  const [blockers, setBlockers] = useState("");
  const [onCall, setOnCall] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lastActiveRef = useRef(Date.now());
  const idleAccumulator = useRef(0);
  const activeAccumulator = useRef(0);

  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      const delta = (now - lastActiveRef.current) / 1000;
      if (delta < 120) activeAccumulator.current += delta;
      lastActiveRef.current = now;
    };

    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const idleTimer = setInterval(() => {
      const now = Date.now();
      const since = (now - lastActiveRef.current) / 1000;
      if (since > 60) idleAccumulator.current += 30;
    }, 30000);

    const pulseTimer = setInterval(async () => {
      if (activeAccumulator.current > 0 || idleAccumulator.current > 0) {
        try {
          await reportActivityPulse(
            Math.round(activeAccumulator.current),
            Math.round(idleAccumulator.current),
          );
        } catch {
          /* silent */
        }
        activeAccumulator.current = 0;
        idleAccumulator.current = 0;
      }
    }, 120000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(idleTimer);
      clearInterval(pulseTimer);
    };
  }, []);

  const poll = useCallback(async () => {
    try {
      const result = await pollWorkCheck();
      if (result.active && result.checkId) {
        setCheckId(result.checkId);
        setMode(
          result.type === "work_update_required" ? "work_update_required" : "quick_check",
        );
        setMessage(result.message ?? "Quick work check");
        setOpen(true);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Gexart CRM — Work Check", {
            body: result.message ?? "Please acknowledge your work session.",
            tag: "gexart-work-check",
          });
        }
      }
    } catch {
      /* not clocked in or monitoring disabled */
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const interval = setInterval(poll, 60000);
    poll();
    return () => clearInterval(interval);
  }, [poll]);

  const handleAcknowledge = async () => {
    if (!checkId) return;
    setSubmitting(true);
    try {
      await respondToWorkCheck({ checkId, responseType: "acknowledge" });
      toast.success("Check acknowledged");
      setOpen(false);
      setCheckId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkUpdate = async () => {
    if (!checkId) return;
    setSubmitting(true);
    try {
      await respondToWorkCheck({
        checkId,
        responseType: "work_update",
        workDone,
        workInProgress,
        blockers,
        onCall,
      });
      toast.success("Work update submitted");
      setOpen(false);
      setCheckId(null);
      setWorkDone("");
      setWorkInProgress("");
      setBlockers("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "work_update_required" ? "Work Update Required" : "Quick Work Check"}
            </DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>

          {mode === "work_update_required" && (
            <div className="space-y-3 py-2">
              <div>
                <Label>Work completed</Label>
                <Textarea value={workDone} onChange={(e) => setWorkDone(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Work in progress</Label>
                <Textarea value={workInProgress} onChange={(e) => setWorkInProgress(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Blockers</Label>
                <Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={onCall} onCheckedChange={setOnCall} />
                <Label>I am on a call / meeting</Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {mode === "quick_check" ? (
              <>
                <Button variant="outline" onClick={() => setMode("work_update_required")}>
                  Update Work
                </Button>
                <Button onClick={handleAcknowledge} disabled={submitting}>
                  Acknowledge
                </Button>
              </>
            ) : (
              <Button onClick={handleWorkUpdate} disabled={submitting || !workDone.trim()}>
                Submit Update
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
