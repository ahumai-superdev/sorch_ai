"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Anchor } from "lucide-react";

interface Task {
  id: number;
  name: string;
  status: string;
  total_candidates: number;
  processed_candidates: number;
  avg_score: number | null;
  is_active: boolean;
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/tasks")
      .then(r => r.json())
      .then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleActive = async (id: number, current: boolean) => {
    await fetch(`/api/v1/tasks/${id}/toggle`, { method: "PATCH" });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Batch maritime screening — upload leads, AI calls them all</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new"><Plus className="h-4 w-4 mr-2" />New Task</Link>
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-lg bg-muted/20">
          <Anchor className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Create your first screening task. Upload a CSV of seafarers or bulk CVs — the AI handles the rest.
          </p>
          <Button asChild>
            <Link href="/tasks/new"><Plus className="h-4 w-4 mr-2" />Create First Task</Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">{task.name}</Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">⚓ Maritime Screener</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={task.status === "running" ? "default" : "secondary"}>{task.status || "draft"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.processed_candidates}/{task.total_candidates}
                  </TableCell>
                  <TableCell>
                    {task.avg_score != null
                      ? <span className={`font-semibold ${task.avg_score >= 85 ? "text-green-600" : task.avg_score >= 60 ? "text-yellow-600" : "text-red-600"}`}>{Math.round(task.avg_score)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Switch checked={task.is_active} onCheckedChange={() => toggleActive(task.id, task.is_active)} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(task.created_at).toLocaleDateString("en-IN")}
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
