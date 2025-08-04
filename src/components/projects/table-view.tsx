"use client";
import { useState, useMemo, MutableRefObject } from 'react';
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
    currentUserId?: string;
    printSectionRef: MutableRefObject<HTMLDivElement | null>;
    onEditTask: (task: Task) => void;
    onViewTask: (task: Task) => void;
    onOpenObservations: (task: Task) => void;
    deleteTask: (taskId: string) => Promise<boolean>;
}

export default function TableView({
    tasks,
    loading,
    isManager,
    currentUserId,
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

    const handleSelectAll = (checked: boolean) => {
        const newSelectedTasks = new Set<string>();
        if (checked) {
            tasks.forEach((task: Task) => newSelectedTasks.add(task.id));
        }
        setSelectedTasks(newSelectedTasks);
    };
    
    const renderTaskRows = (tasksToRender: Task[], level = 0) => {
        return tasksToRender.map(task => (
            <TaskRow
                key={task.id}
                task={task}
                level={level}
                isSelected={selectedTasks.has(task.id)}
                isManager={isManager}
                currentUserId={currentUserId}
                expanded={expandedRows.has(task.id)}
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
                renderSubtasks={renderTaskRows} // Passar a função de renderização para a recursão
            />
        ));
    };

    return (
        <div ref={printSectionRef} className="border rounded-md overflow-x-auto flex-1">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">
                            <Checkbox 
                                checked={selectedTasks.size > 0 && selectedTasks.size === tasks.length} 
                                onCheckedChange={(checked) => handleSelectAll(!!checked)} 
                            />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        {filteredVisibleColumns.map(col => <TableHead key={col.id}>{col.name}</TableHead>)}
                        <TableHead>Ações</TableHead>
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
}
