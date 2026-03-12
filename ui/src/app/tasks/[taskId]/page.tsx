"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Square, Anchor } from "lucide-react";

interface Candidate {
  id: number;
  name: string | null;
  phone: string | null;
  call_status: string;
  ai_score: number | null;
  rank: string | null;
  strengths: string[];
  red_flags: string[];
  summary: string | null;
}

interface Task {
  id: number;
  name: string;
  status: string;
  is_active: boolean;
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [taskRes, candRes] = await Promise.all([
        fetch(`/api/v1/tasks/${taskId}`),
        fetch(`/api/v1/tasks/${taskId}/candidates`),
      ]);
      if (taskRes.ok) setTask(await taskRes.json());
      if (candRes.ok) setCandidates(await candRes.json());
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleActive = async () => {
    await fetch(`/api/v1/tasks/${taskId}/toggle`, { method: "PATCH" });
    setTask(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
  };

  const scoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 85) return "text-green-600 font-bold";
    if (score >= 60) return "text-yellow-600 font-semibold";
    return "text-red-600";
  };

  const scored = candidates.filter(c => c.ai_score != null);
  const stats = {
    total: candidates.length,
    processed: candidates.filter(c => c.call_status === "completed").length,
    highScorers: candidates.filter(c => (c.ai_score ?? 0) >= 85).length,
    avgScore: scored.length ? Math.round(scored.reduce((a, c) => a + (c.ai_score ?? 0), 0) / scored.length) : null,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!task) return <div className="p-8 text-muted-foreground">Task not found</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Anchor className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">{task.name}</h1>
            <Badge variant="outline" className="text-xs mt-1">⚓ Maritime Screener</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active</span>
            <Switch checked={task.is_active} onCheckedChange={toggleActive} />
          </div>
          {task.status === "running"
            ? <Button variant="outline" size="sm" onClick={() => fetch(`/api/v1/tasks/${taskId}/stop`, { method: "POST" }).then(fetchData)}>
                <Square className="h-4 w-4 mr-1" />Stop
              </Button>
            : <Button size="sm" onClick={() => fetch(`/api/v1/tasks/${taskId}/start`, { method: "POST" }).then(fetchData)}>
                <Play className="h-4 w-4 mr-1" />Start
              </Button>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Candidates", value: stats.total },
          { label: "Processed", value: stats.processed },
          { label: "Avg Score", value: stats.avgScore ?? "—" },
          { label: "High Scorers (85+)", value: stats.highScorers },
        ].map(stat => (
          <div key={stat.label} className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg bg-muted/20">
          <Anchor className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No candidates yet. Start the task to begin screening.</p>
          <p className="text-xs text-muted-foreground mt-1">Dashboard auto-refreshes every 10 seconds.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Call Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Strengths</TableHead>
                <TableHead>Red Flags</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.call_status === "completed" ? "secondary" : c.call_status === "connected" ? "default" : "outline"}>
                      {c.call_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={scoreColor(c.ai_score)}>{c.ai_score ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm">{c.rank ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.strengths ?? []).slice(0, 2).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{s}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.red_flags ?? []).slice(0, 2).map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{f}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{c.summary ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
