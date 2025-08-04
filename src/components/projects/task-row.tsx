"use client";
import { Fragment, useState } from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ChevronRight, Eye, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from '@/components/ui/progress';
import type { Task, Tag } from "@/lib/types";
import { useTableSettings } from '@/hooks/use-table-settings';
import { parseUTCDate } from '@/lib/date-utils';
import { AlertModal } from '@/components/shared/alert-modal';

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

const renderCell = (task: Task, columnId: string, columns: any[]) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return null;

    if (column.id.startsWith('custom_')) {
        const value = task.custom_fields?.[columnId];
        switch (column.type) {
            case 'text':
            case 'number':
                return value || 'N/A';
            case 'date':
                return value ? parseUTCDate(value).toLocaleDateString() : 'N/A';
            case 'progress':
                return <div className="flex items-center gap-2"><Progress value={value || 0} className="w-[60%]" /> <span>{value || 0}%</span></div>;
            default:
                return 'N/A';
        }
    }

    switch (columnId) {
        case 'formatted_id': return task.formatted_id;
        case 'project_name': return task.project_name || 'N/A';
        case 'assignee': return task.assignee_name || 'N/A';
        case 'status': return <Badge style={{ backgroundColor: task.status_color }} className="text-white">{task.status_name}</Badge>;
        case 'priority': return <Badge variant={task.priority === 'Alta' ? 'destructive' : task.priority === 'Média' ? 'secondary' : 'outline'}>{task.priority}</Badge>;
        case 'tags': return <div className="flex flex-wrap gap-1">{task.tags?.map((t: Tag) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}</div>;
        case 'progress': return <div className="flex items-center gap-2"><Progress value={task.progress || 0} className="w-[60%]" /> <span>{task.progress || 0}%</span></div>;
        case 'start_date': return task.start_date ? parseUTCDate(task.start_date).toLocaleDateString() : 'N/A';
        case 'end_date': return task.end_date ? parseUTCDate(task.end_date).toLocaleDateString() : 'N/A';
        case 'duration':
            if (task.start_date && task.end_date) {
                const start = parseUTCDate(task.start_date);
                const end = parseUTCDate(task.end_date);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return `${diffDays} dias`;
            }
            return 'N/A';
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
  const { columns } = useTableSettings();
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  const canEdit = isManager || task.assignee_id === currentUserId;
  const canDelete = isManager;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  
  const handleDelete = () => {
    onDeleteTask(task.id);
    setIsAlertModalOpen(false);
  };

  return (
    <Fragment>
      <AlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Tarefa"
        description={`Tem certeza de que deseja excluir a tarefa "${task.name}"? Esta ação não pode ser desfeita.`}
      />
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
        <TableCell>{task.formatted_id}</TableCell>
        <TableCell className="font-medium">{task.wbs_code} {task.name}</TableCell>
        {visibleColumns.filter(c => c !== 'formatted_id').map((colId) => (
          <TableCell key={colId}>{renderCell(task, colId, columns)}</TableCell>
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
                  <DropdownMenuItem onClick={() => setIsAlertModalOpen(true)} className="text-red-600">
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
