"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

interface TaskSummary {
  id: number;
  name: string;
  template: string;
  status: string;
  total_candidates: number;
  processed_candidates: number;
  avg_score: number | null;
  is_active: boolean;
  created_at: string;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "running":
    case "active":
      return "default";
    case "paused":
      return "outline";
    case "completed":
      return "secondary";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "running":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    default:
      return status || "Draft";
  }
}

export default function TasksPage() {
  const { user, getAccessToken, redirectToLogin, loading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      redirectToLogin();
    }
  }, [loading, user, redirectToLogin]);

  useEffect(() => {
    if (loading || !user || hasFetched.current) return;
    hasFetched.current = true;

    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const accessToken = await getAccessToken();
        const res = await fetch("/api/v1/tasks", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : data.tasks ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [loading, user, getAccessToken]);

  const handleToggle = async (id: number, current: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
    );
    try {
      const accessToken = await getAccessToken();
      await fetch(`/api/v1/tasks/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: current } : t))
      );
      console.error("Failed to toggle task:", err);
    }
  };

  const handleRowClick = (id: number) => {
    router.push(`/tasks/${id}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <p className="text-muted-foreground">Batch maritime screening — upload leads, AI calls them all</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>View and manage your maritime screening tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">
                No tasks yet. Create your first maritime screening task.
              </p>
              <Button asChild variant="outline">
                <Link href="/tasks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Candidates</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Score Avg</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(task.id)}
                    >
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {task.template || "Maritime Screener"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.total_candidates}</TableCell>
                      <TableCell>{task.processed_candidates}</TableCell>
                      <TableCell>
                        {task.avg_score != null ? (
                          <span
                            className={
                              task.avg_score >= 85
                                ? "font-semibold text-green-600"
                                : task.avg_score >= 60
                                ? "font-semibold text-yellow-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {Math.round(task.avg_score)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={task.is_active}
                          onCheckedChange={() => handleToggle(task.id, task.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(task.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
