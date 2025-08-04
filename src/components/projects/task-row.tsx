"use client";
import { Fragment } from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ChevronRight, Eye, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from '@/components/ui/progress';
import type { Task, Tag } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  level: number;
  isSelected: boolean;
  isManager: boolean;
  currentUserId?: string;
  expanded: boolean;
  visibleColumns: string[];
  onSelect: (checked: boolean) => void;
  onToggleExpand: () => void;
  onViewTask: (task: Task) => void;
  onOpenObservations: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  renderSubtasks: (tasks: Task[], level: number) => React.ReactNode;
}

const renderCell = (task: Task, columnId: string) => {
    switch (columnId) {
        case 'project_name': return task.project_name || 'N/A';
        case 'assignee': return task.assignee_name || 'N/A';
        case 'status': return <Badge style={{ backgroundColor: task.status_color }} className="text-white">{task.status_name}</Badge>;
        case 'priority': return <Badge variant={task.priority === 'Alta' ? 'destructive' : task.priority === 'Média' ? 'secondary' : 'outline'}>{task.priority}</Badge>;
        case 'tags': return <div className="flex flex-wrap gap-1">{task.tags?.map((t: Tag) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}</div>;
        case 'progress': return <div className="flex items-center gap-2"><Progress value={task.progress || 0} className="w-[60%]" /> <span>{task.progress || 0}%</span></div>;
        case 'start_date': return task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A';
        case 'end_date': return task.end_date ? new Date(task.end_date).toLocaleDateString() : 'N/A';
        default: return null;
    }
};

export default function TaskRow({
  task,
  level,
  isSelected,
  isManager,
  currentUserId,
  expanded,
  visibleColumns,
  onSelect,
  onToggleExpand,
  onViewTask,
  onOpenObservations,
  onEditTask,
  onDeleteTask,
  renderSubtasks,
}: TaskRowProps) {
  const canEdit = isManager || task.assignee_id === currentUserId;
  const canDelete = isManager;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <Fragment>
      <TableRow>
        <TableCell style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}>
          <div className="flex items-center gap-2">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} />
            {hasSubtasks && (
              <Button variant="ghost" size="icon" onClick={onToggleExpand}>
                <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium">{task.wbs_code} {task.name}</TableCell>
        {visibleColumns.map((col) => (
          <TableCell key={col}>{renderCell(task, col)}</TableCell>
        ))}
        <TableCell>
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewTask(task)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenObservations(task)}><MessageSquare className="mr-2 h-4 w-4" />Observações</DropdownMenuItem>
                
                {(canEdit || canDelete) && <DropdownMenuSeparator />}
                
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEditTask(task)}>
                    <Edit className="mr-2 h-4 w-4" />Editar
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
      {expanded && hasSubtasks && renderSubtasks(task.subtasks, level + 1)}
    </Fragment>
  );
}
