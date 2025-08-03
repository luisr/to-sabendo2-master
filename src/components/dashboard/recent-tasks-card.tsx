
"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTableSettings } from "@/hooks/use-table-settings";
import type { Task } from "@/lib/types";

interface RecentTasksCardProps {
  tasks: Task[]; // Expects tasks to be passed as a prop
}

export default function RecentTasksCard({ tasks }: RecentTasksCardProps) {
    const { statuses } = useTableSettings();

    const recentTasks = useMemo(() => {
        // The component now works with the tasks list it receives.
        const allTasks = tasks || [];
        // Sort by creation date and take the 5 most recent
        return allTasks
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [tasks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas Recentes</CardTitle>
        <CardDescription>
          As tarefas mais recentes adicionadas nos seus projetos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(recentTasks || []).map((task) => {
              const status = (statuses || []).find(s => s.id === task.status_id);
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium">{task.name}</div>
                  </TableCell>
                  <TableCell>
                    {status && <Badge variant="outline">{status.name}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Avatar className="h-8 w-8 inline-flex">
                      <AvatarFallback>{task.assignee_id?.substring(0,2).toUpperCase() || 'N/A'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
