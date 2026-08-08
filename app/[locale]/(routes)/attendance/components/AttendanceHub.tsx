"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceClockPanel from "./AttendanceClockPanel";
import LeavePanel from "./LeavePanel";
import WorkSessionPanel from "./WorkSessionPanel";

export default function AttendanceHub() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance & Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Clock in, track tasks, apply for leave, and respond to productivity checks.
        </p>
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="work">My Work</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <AttendanceClockPanel />
        </TabsContent>
        <TabsContent value="work">
          <WorkSessionPanel />
        </TabsContent>
        <TabsContent value="leave">
          <LeavePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
