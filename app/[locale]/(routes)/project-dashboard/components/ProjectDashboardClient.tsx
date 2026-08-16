"use client";

import React, { useEffect, useState } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers,
  Target,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  Flag,
} from "lucide-react";
import { getProjectDashboardData } from "../actions/project-dashboard-actions";

export default function ProjectDashboardClient() {
  const [data, setData] = useState<any>(null);
  const [boardId, setBoardId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async (id?: string) => {
    setLoading(true);
    try {
      const result = await getProjectDashboardData(id);
      setData(result);
      if (!boardId && "selectedBoardId" in result && result.selectedBoardId) {
        setBoardId(result.selectedBoardId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onBoardChange = (id: string) => {
    setBoardId(id);
    load(id);
  };

  if (loading && !data) {
    return (
      <Container title="Project Command Center" description="Sprints, milestones, and time logs">
        <p className="text-muted-foreground">Loading...</p>
      </Container>
    );
  }

  const stats = data?.stats ?? {};
  const sprints = data?.sprints ?? [];
  const milestones = data?.milestones ?? [];
  const team = data?.team ?? [];
  const timeLogs = data?.timeLogs ?? [];

  return (
    <Container
      title="Project Command Center"
      description={`Sprints · Milestones · Time logs — ${data?.boardTitle ?? "Project"}`}
    >
      <div className="flex justify-end mb-4">
        <Select value={boardId} onValueChange={onBoardChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select project board" />
          </SelectTrigger>
          <SelectContent>
            {(data?.boards ?? []).map((b: any) => (
              <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <Kpi title="Total Tasks" value={stats.totalTasks} icon={<Target className="h-4 w-4" />} />
        <Kpi title="Completed" value={stats.completedTasks} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Kpi title="Open" value={stats.openTasks} icon={<Layers className="h-4 w-4" />} />
        <Kpi title="Hours Logged" value={`${stats.totalHours}h`} icon={<Clock className="h-4 w-4" />} />
        <Kpi title="Sprint Velocity" value={`${stats.sprintVelocity}%`} icon={<Zap className="h-4 w-4" />} />
        <Kpi title="Team Size" value={stats.teamSize} icon={<Users className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="sprints">
        <TabsList>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="timelogs">Time Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sprints" className="mt-4 space-y-3">
          {sprints.length === 0 && <p className="text-muted-foreground text-sm">No sprints on this board.</p>}
          {sprints.map((s: any) => (
            <Card key={s.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{s.name}</CardTitle>
                <Badge>{s.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{s.completedTasks}/{s.totalTasks} tasks · {s.progress}% complete</p>
                <p className="text-muted-foreground">
                  {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                </p>
                <div className="mt-2 h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${s.progress}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-3">
          {milestones.length === 0 && <p className="text-muted-foreground text-sm">No milestones defined.</p>}
          {milestones.map((m: any) => (
            <Card key={m.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flag className="h-4 w-4" /> {m.name}
                </CardTitle>
                <Badge variant="outline">{m.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{m.tasksDone}/{m.tasksTotal} tasks · {m.progress}%</p>
                {m.dueDate && <p className="text-muted-foreground">Due: {new Date(m.dueDate).toLocaleDateString()}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left">Member</th>
                    <th className="p-3 text-right">Assigned</th>
                    <th className="p-3 text-right">Completed</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((t: any) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-3">{t.name}</td>
                      <td className="p-3 text-right">{t.tasksAssigned}</td>
                      <td className="p-3 text-right">{t.tasksCompleted}</td>
                      <td className="p-3 text-right">{t.hoursLogged}h</td>
                      <td className="p-3 text-right">{t.utilization}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timelogs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left">Task</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {timeLogs.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-3">{l.taskName}</td>
                      <td className="p-3">{l.user}</td>
                      <td className="p-3 text-right">{l.hours}h</td>
                      <td className="p-3">{new Date(l.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {timeLogs.length === 0 && <p className="p-4 text-muted-foreground text-sm">No time logs yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}

function Kpi({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
    </Card>
  );
}
