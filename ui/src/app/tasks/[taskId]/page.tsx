"use client";

import { Anchor, ChevronLeft, Play, Square } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";

import { getScoreClass } from "./utils";

interface TaskDetail {
  id: number;
  name: string;
  template: string;
  status: string;
  is_active: boolean;
  total_candidates: number;
  processed_candidates: number;
  avg_score: number | null;
  created_at: string;
}

interface Candidate {
  id: number;
  name: string | null;
  phone: string | null;
  call_status: string;
  ai_score: number | null;
  strengths: string[];
  red_flags: string[];
  summary: string | null;
  recording_url: string | null;
}

function getCallStatusClass(status: string): string {
  switch (status.toLowerCase()) {
    case "ringing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "connected":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "voicemail":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "pending":
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user, getAccessToken, redirectToLogin, loading } = useAuth();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      redirectToLogin();
    }
  }, [loading, user, redirectToLogin]);

  const fetchCandidates = useCallback(async () => {
    if (!user) return;
    try {
      const accessToken = await getAccessToken();
      const res = await fetch(`/api/v1/tasks/${taskId}/candidates?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : (data.candidates ?? []));
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  }, [taskId, user, getAccessToken]);

  useEffect(() => {
    if (loading || !user || hasFetched.current) return;
    hasFetched.current = true;

    const fetchTask = async () => {
      setIsLoading(true);
      try {
        const accessToken = await getAccessToken();
        const res = await fetch(`/api/v1/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) setTask(await res.json());
      } catch (err) {
        console.error("Failed to fetch task:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
    fetchCandidates();

    const interval = setInterval(fetchCandidates, 10000);
    return () => clearInterval(interval);
  }, [loading, user, taskId, getAccessToken, fetchCandidates]);

  const handleToggle = async () => {
    if (!task) return;
    const accessToken = await getAccessToken();
    await fetch(`/api/v1/tasks/${taskId}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setTask((prev) => (prev ? { ...prev, is_active: !prev.is_active } : prev));
  };

  const handleStart = async () => {
    const accessToken = await getAccessToken();
    await fetch(`/api/v1/tasks/${taskId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setTask((prev) => (prev ? { ...prev, status: "running" } : prev));
  };

  const handleStop = async () => {
    const accessToken = await getAccessToken();
    await fetch(`/api/v1/tasks/${taskId}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setTask((prev) => (prev ? { ...prev, status: "paused" } : prev));
  };

  // Compute stats from candidates
  const scored = candidates.filter((c) => c.ai_score !== null);
  const stats = {
    total: candidates.length,
    processed: candidates.filter((c) => c.call_status === "completed").length,
    avgScore: scored.length
      ? Math.round(scored.reduce((a, c) => a + (c.ai_score ?? 0), 0) / scored.length)
      : null,
    highScorers: candidates.filter((c) => (c.ai_score ?? 0) >= 85).length,
    inProgress: candidates.filter(
      (c) => c.call_status === "ringing" || c.call_status === "connected"
    ).length,
  };

  // Client-side filtering
  const filtered = candidates.filter((c) => {
    const scoreOk =
      scoreFilter === "all" ||
      (scoreFilter === "high" && (c.ai_score ?? 0) >= 85) ||
      (scoreFilter === "medium" &&
        (c.ai_score ?? 0) >= 60 &&
        (c.ai_score ?? 0) < 85) ||
      (scoreFilter === "low" && (c.ai_score ?? 0) < 60);
    const statusOk =
      statusFilter === "all" || c.call_status === statusFilter;
    return scoreOk && statusOk;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!task) {
    return <div className="p-8 text-muted-foreground">Task not found.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Tasks
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Anchor className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">{task.name}</h1>
            <Badge variant="outline" className="text-xs mt-1">
              ⚓ Maritime Screener
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active</span>
            <Switch checked={task.is_active} onCheckedChange={handleToggle} />
          </div>
          {task.status === "running" ? (
            <Button variant="outline" size="sm" onClick={handleStop}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={handleStart}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4" data-testid="stats-row">
        {[
          { label: "Total", value: stats.total },
          { label: "Processed", value: stats.processed },
          { label: "Score Avg", value: stats.avgScore ?? "—" },
          { label: "High Scorers (85+)", value: stats.highScorers },
          { label: "In Progress", value: stats.inProgress },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-4">
        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-background"
          aria-label="Score range filter"
        >
          <option value="all">All Scores</option>
          <option value="high">High (85+)</option>
          <option value="medium">Medium (60-84)</option>
          <option value="low">Low (&lt;60)</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-background"
          aria-label="Call status filter"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="ringing">Ringing</option>
          <option value="connected">Connected</option>
          <option value="voicemail">Voicemail</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Candidate table or empty state */}
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg bg-muted/20">
          <Anchor className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No candidates yet. Start the task to begin screening.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dashboard auto-refreshes every 10 seconds.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Call Status</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Strengths</TableHead>
                <TableHead>Red Flags</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getCallStatusClass(c.call_status)}>
                      {c.call_status.charAt(0).toUpperCase() +
                        c.call_status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={getScoreClass(c.ai_score)}>
                      {c.ai_score ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.strengths ?? []).slice(0, 2).map((s, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.red_flags ?? []).slice(0, 2).map((f, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        >
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs">
                    <span title={c.summary ?? ""}>
                      {c.summary
                        ? c.summary.slice(0, 80) +
                          (c.summary.length > 80 ? "…" : "")
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.recording_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Play recording"
                        >
                          <Play className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
