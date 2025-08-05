"use client";
import { useState, useMemo, forwardRef, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import TaskRow from './task-row';
import { useTableSettings } from '@/hooks/use-table-settings';
import type { Task, User } from '@/lib/types';

// Tipos
type TaskWithSubtasks = Task & { subtasks?: TaskWithSubtasks[] };

interface TableViewProps {
    tasks: TaskWithSubtasks[];
    users: User[];
    loading: boolean;
    isManager: boolean;
    currentUserId?: string;
    onEditTask: (task: Task) => void;
    onViewTask: (task: Task) => void;
    onOpenObservations: (task: Task) => void;
    deleteTask: (taskId: string) => Promise<boolean>;
    selectedTasks: Set<string>;
    setSelectedTasks: (tasks: Set<string>) => void;
}

const TableView = forwardRef<HTMLDivElement, TableViewProps>(({
    tasks,
    loading,
    isManager,
    currentUserId,
    onEditTask,
    onViewTask,
    onOpenObservations,
    deleteTask,
    selectedTasks,
    setSelectedTasks,
}, ref) => {
    const { visibleColumns, columns } = useTableSettings();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const filteredVisibleColumns = useMemo(() => columns.filter(c => visibleColumns.includes(c.id)), [columns, visibleColumns]);

    const allTaskIds = useMemo(() => {
        const ids: string[] = [];
        const traverse = (taskList: TaskWithSubtasks[]) => {
            for (const task of taskList) {
                ids.push(task.id);
                if (task.subtasks) traverse(task.subtasks);
            }
        };
        traverse(tasks);
        return ids;
    }, [tasks]);

    const handleSelectAll = (checked: boolean) => {
        setSelectedTasks(checked ? new Set(allTaskIds) : new Set());
    };
    
    const renderTaskRows = (tasksToRender: TaskWithSubtasks[], level = 0): React.ReactNodeArray => {
        return tasksToRender.map(task => (
            <Fragment key={task.id}>
                <TaskRow
                    task={task}
                    level={level}
                    isSelected={selectedTasks.has(task.id)}
                    isManager={isManager}
                    currentUserId={currentUserId}
                    hasSubtasks={!!task.subtasks && task.subtasks.length > 0}
                    isExpanded={expandedRows.has(task.id)}
                    visibleColumns={filteredVisibleColumns.map(c => c.id)}
                    onSelect={(isChecked) => {
                        const newSelectedTasks = new Set(selectedTasks);
                        if (isChecked) newSelectedTasks.add(task.id);
                        else newSelectedTasks.delete(task.id);
                        setSelectedTasks(newSelectedTasks);
                    }}
                    onToggleExpand={() => {
                        const newExpandedRows = new Set(expandedRows);
                        if (newExpandedRows.has(task.id)) newExpandedRows.delete(task.id);
                        else newExpandedRows.add(task.id);
                        setExpandedRows(newExpandedRows);
                    }}
                    onViewTask={onViewTask}
                    onOpenObservations={onOpenObservations}
                    onEditTask={onEditTask}
                    onDeleteTask={deleteTask}
                />
                {expandedRows.has(task.id) && task.subtasks && renderTaskRows(task.subtasks, level + 1)}
            </Fragment>
        ));
    };

    return (
        <div ref={ref} className="border rounded-md overflow-x-auto flex-1">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">
                            <Checkbox 
                                checked={allTaskIds.length > 0 && selectedTasks.size === allTaskIds.length} 
                                onCheckedChange={(checked) => handleSelectAll(!!checked)} 
                                disabled={allTaskIds.length === 0}
                            />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        {filteredVisibleColumns.map(col => <TableHead key={col.id}>{col.name}</TableHead>)}
                        <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {loading ? (
                        <TableRow><TableCell colSpan={filteredVisibleColumns.length + 3} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                    ) : tasks.length > 0 ? (
                        renderTaskRows(tasks)
                    ) : (
                        <TableRow><TableCell colSpan={filteredVisibleColumns.length + 3} className="h-24 text-center">Nenhuma tarefa encontrada.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
});

TableView.displayName = "TableView";
export default TableView;
