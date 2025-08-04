"use client";
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import TaskRow from './task-row';
import { useTableSettings } from '@/hooks/use-table-settings';
import type { Task, User } from '@/lib/types';

interface TableViewProps {
    tasks: Task[];
    users: User[];
    loading: boolean;
    isManager: boolean;
    printSectionRef: (node: HTMLDivElement | null) => void;
    onEditTask: (task: Task) => void;
    onViewTask: (task: Task) => void;
    onOpenObservations: (task: Task) => void;
    deleteTask: (taskId: string) => Promise<boolean>;
}

export default function TableView({
    tasks,
    loading,
    isManager,
    printSectionRef,
    onEditTask,
    onViewTask,
    onOpenObservations,
    deleteTask,
}: TableViewProps) {
    const { visibleColumns } = useTableSettings();
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const columns = useMemo(() => [
        { id: 'project_name', name: 'Projeto' },
        { id: 'assignee', name: 'Responsável' },
        { id: 'status', name: 'Status' },
        { id: 'priority', name: 'Prioridade' },
        { id: 'tags', name: 'Tags' },
        { id: 'progress', name: 'Progresso' },
        { id: 'start_date', name: 'Início' },
        { id: 'end_date', name: 'Fim' },
    ], []);

    const filteredVisibleColumns = useMemo(() => columns.filter(c => visibleColumns.includes(c.id)), [columns, visibleColumns]);
    const topLevelTasks = useMemo(() => tasks.filter(task => !task.parent_id), [tasks]);

    const handleSelectAll = (checked: boolean) => {
        const newSelectedTasks = new Set<string>();
        if (checked) {
            topLevelTasks.forEach((task: Task) => newSelectedTasks.add(task.id));
        }
        setSelectedTasks(newSelectedTasks);
    };

    const handleSelectRow = (taskId: string, isSelected: boolean) => {
        const newSelectedTasks = new Set(selectedTasks);
        if (isSelected) {
            newSelectedTasks.add(taskId);
        } else {
            newSelectedTasks.delete(taskId);
        }
        setSelectedTasks(newSelectedTasks);
    };
    
    const toggleExpand = (taskId: string) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(taskId)) {
            newExpandedRows.delete(taskId);
        } else {
            newExpandedRows.add(taskId);
        }
        setExpandedRows(newExpandedRows);
    };
    
    return (
        <div ref={printSectionRef} className="border rounded-md overflow-x-auto flex-1">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">
                            <Checkbox 
                                checked={selectedTasks.size > 0 && selectedTasks.size === topLevelTasks.length} 
                                onCheckedChange={(checked) => handleSelectAll(!!checked)} 
                            />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        {filteredVisibleColumns.map(col => <TableHead key={col.id}>{col.name}</TableHead>)}
                        {isManager && <TableHead>Ações</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {loading ? (
                        <TableRow><TableCell colSpan={filteredVisibleColumns.length + 3} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                    ) : topLevelTasks.length > 0 ? (
                        topLevelTasks.map(task => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                isSelected={selectedTasks.has(task.id)}
                                isManager={isManager}
                                expanded={expandedRows.has(task.id)}
                                hasSubtasks={task.subtasks && task.subtasks.length > 0}
                                visibleColumns={filteredVisibleColumns.map(c => c.id)}
                                onSelect={(isChecked) => handleSelectRow(task.id, isChecked)}
                                onToggleExpand={() => toggleExpand(task.id)}
                                onViewTask={onViewTask}
                                onOpenObservations={onOpenObservations}
                                onEditTask={onEditTask}
                                onDeleteTask={deleteTask}
                            />
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={filteredVisibleColumns.length + 3} className="h-24 text-center">Nenhuma tarefa encontrada.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
