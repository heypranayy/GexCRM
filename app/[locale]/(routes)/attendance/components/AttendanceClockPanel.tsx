"use client";

import React, { useState, useEffect } from "react";
import { useGeofence } from "../hooks/use-geofence";
import {
  getTodayAttendance,
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
} from "../actions/attendance-actions";
import { getOfficeGeofenceSettings } from "../actions/geofence-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Coffee, ShieldAlert, CheckCircle } from "lucide-react";

export default function AttendanceClockPanel() {
  const [office, setOffice] = useState({ lat: 19.076, lng: 72.8777, radius: 200, branchName: "" });
  const geo = useGeofence(office.lat, office.lng, office.radius);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("office");
  const [breakReason, setBreakReason] = useState("");

  const fetchAttendance = async () => {
    try {
      const res = await getTodayAttendance();
      setAttendance(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOfficeGeofenceSettings()
      .then((s) => setOffice({ lat: s.lat, lng: s.lng, radius: s.radiusMeters, branchName: s.branchName ?? "" }))
      .catch(console.error);
    fetchAttendance();
  }, []);

  const handleClockIn = async () => {
    if (!geo.latitude || !geo.longitude) return;
    try {
      setLoading(true);
      const res = await clockInAction({
        lat: geo.latitude,
        lng: geo.longitude,
        accuracy: geo.accuracy || 10,
        ip: "127.0.0.1",
        deviceFingerprint: navigator.userAgent,
        isFakeGps: geo.isMocked,
        mode,
      });
      setAttendance(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to clock in");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!geo.latitude || !geo.longitude) return;
    try {
      setLoading(true);
      const res = await clockOutAction({
        lat: geo.latitude,
        lng: geo.longitude,
        accuracy: geo.accuracy || 10,
        ip: "127.0.0.1",
        deviceFingerprint: navigator.userAgent,
        isFakeGps: geo.isMocked,
      });
      setAttendance(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to clock out");
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!attendance) return;
    try {
      setLoading(true);
      await startBreakAction(attendance.id, breakReason || "Break");
      await fetchAttendance();
      setBreakReason("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start break");
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async (breakId: string) => {
    try {
      setLoading(true);
      await endBreakAction(breakId);
      await fetchAttendance();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to end break");
    } finally {
      setLoading(false);
    }
  };

  const activeBreak = attendance?.breaks?.find((b: { endTime: string | null }) => !b.endTime);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="col-span-1 border border-border bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {geo.loading ? (
            <p className="text-muted-foreground">Fetching location...</p>
          ) : geo.error ? (
            <div className="flex items-start gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <p>{geo.error}</p>
            </div>
          ) : (
            <>
              {office.branchName && <p className="text-xs text-muted-foreground">Office: {office.branchName}</p>}
              <div className="flex justify-between">
                <span>Geofence</span>
                {geo.isWithinGeofence ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Inside</Badge>
                ) : (
                  <Badge variant="destructive">Outside</Badge>
                )}
              </div>
              <div className="flex justify-between">
                <span>Distance</span>
                <span className="font-mono">{(geo.distance || 0).toFixed(1)}m</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-2 border border-border bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" /> Shift
          </CardTitle>
          <CardDescription>Clock in starts productivity monitoring checks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!attendance ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button variant={mode === "office" ? "default" : "outline"} onClick={() => setMode("office")} className="flex-1">
                  Office
                </Button>
                <Button variant={mode === "remote" ? "default" : "outline"} onClick={() => setMode("remote")} className="flex-1">
                  Remote
                </Button>
              </div>
              <Button
                onClick={handleClockIn}
                disabled={loading || (mode === "office" && !geo.isWithinGeofence) || !!geo.error}
                className="w-full h-12"
              >
                Clock In
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex justify-between">
                <span className="text-emerald-600 font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Clocked In
                </span>
                <span className="font-mono text-xs">{new Date(attendance.clockIn).toLocaleTimeString()}</span>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Coffee className="h-3.5 w-3.5" /> Breaks
                </h4>
                {activeBreak ? (
                  <Button onClick={() => handleEndBreak(activeBreak.id)} variant="outline" className="w-full">
                    End Break
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-transparent"
                      placeholder="Break reason"
                      value={breakReason}
                      onChange={(e) => setBreakReason(e.target.value)}
                    />
                    <Button onClick={handleStartBreak} disabled={loading}>Start Break</Button>
                  </div>
                )}
              </div>
              {!attendance.clockOut ? (
                <Button onClick={handleClockOut} variant="destructive" className="w-full h-12">
                  Clock Out
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Shift completed</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
