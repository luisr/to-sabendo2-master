"use client";
import { useState, useMemo, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '../ui/button';
import { MoreHorizontal, ChevronRight, Loader2, Eye, MessageSquare, Edit, Trash2 } from 'lucide-react';
import type { Task, Tag, User } from '@/lib/types';
import { Progress } from '../ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useTableSettings } from '@/hooks/use-table-settings';

const TaskRow = ({ task, onSelect, isSelected, columns, isManager, onEditTask, expanded, onToggleExpand, hasSubtasks, onDeleteTask, onViewTask, onOpenObservations }: any) => {
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
    
    return (
        <Fragment>
            <TableRow>
                <TableCell className="w-[80px]">
                     <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
                        {hasSubtasks && ( <Button variant="ghost" size="icon" onClick={onToggleExpand}><ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} /></Button> )}
                    </div>
                </TableCell>
                <TableCell className="font-medium">{task.wbs_code} {task.name}</TableCell>
                {columns.map((col: any) => <TableCell key={col.id}>{renderCell(task, col.id)}</TableCell>)}
                {isManager && (
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onViewTask}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                                <DropdownMenuItem onClick={onOpenObservations}><MessageSquare className="mr-2 h-4 w-4" />Observações</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={onEditTask}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={onDeleteTask} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                )}
            </TableRow>
             {expanded && task.subtasks?.map((subtask: Task) => (
                <TaskRow key={subtask.id} task={subtask} onSelect={() => {}} isSelected={false} columns={columns} isManager={isManager} onEditTask={() => onEditTask(subtask)} onDeleteTask={() => onDeleteTask(subtask.id)} onViewTask={() => onViewTask(subtask)} onOpenObservations={() => onOpenObservations(subtask)} expanded={false} onToggleExpand={() => {}} hasSubtasks={false} />
            ))}
        </Fragment>
    );
};

// **ARQUITETURA FINAL: Componente funcional simples, sem forwardRef.**
interface TableViewProps {
    tasks: Task[]; users: User[];
    onEditTask: (task: Task) => void; onViewTask: (task: Task) => void;
    onOpenObservations: (task: Task) => void; deleteTask: (taskId: string) => Promise<boolean>;
    loading: boolean; isManager: boolean;
    printSectionRef: React.RefObject<HTMLDivElement>; // **A ref é recebida como uma prop normal.**
}

const TableView = ({ tasks, users, onEditTask, onViewTask, onOpenObservations, deleteTask, loading, isManager, printSectionRef }: TableViewProps) => {
    const { visibleColumns } = useTableSettings();
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const columns = useMemo(() => [
        { id: 'project_name', name: 'Projeto' }, { id: 'assignee', name: 'Responsável' }, { id: 'status', name: 'Status' },
        { id: 'priority', name: 'Prioridade' }, { id: 'tags', name: 'Tags' }, { id: 'progress', name: 'Progresso' },
        { id: 'start_date', name: 'Início' }, { id: 'end_date', name: 'Fim' },
    ].filter(c => visibleColumns.includes(c.id)), [visibleColumns]);

    const filteredTasks = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        return tasks.filter(task => !task.parent_id);
    }, [tasks]);

    const handleSelectAll = (checked: boolean) => {
        const newSelectedTasks = new Set<string>();
        if (checked) { filteredTasks.forEach((task: Task) => newSelectedTasks.add(task.id)); }
        setSelectedTasks(newSelectedTasks);
    };

    const handleSelectRow = (taskId: string, isSelected: boolean) => {
        const newSelectedTasks = new Set(selectedTasks);
        if (isSelected) { newSelectedTasks.add(taskId); } else { newSelectedTasks.delete(taskId); }
        setSelectedTasks(newSelectedTasks);
    };
    
    const toggleExpand = (taskId: string) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(taskId)) { newExpandedRows.delete(taskId); } else { newExpandedRows.add(taskId); }
        setExpandedRows(newExpandedRows);
    };
    
    return (
        <div ref={printSectionRef} className="border rounded-md overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]"><Checkbox checked={selectedTasks.size > 0 && selectedTasks.size === filteredTasks.length} onCheckedChange={(checked) => handleSelectAll(!!checked)} /></TableHead>
                        <TableHead>Nome</TableHead>
                        {columns.map(col => <TableHead key={col.id}>{col.name}</TableHead>)}
                        {isManager && <TableHead>Ações</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {loading ? (
                        <TableRow><TableCell colSpan={columns.length + 3} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                    ) : filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                            <TaskRow
                                key={task.id} task={task} onSelect={(isChecked: boolean) => handleSelectRow(task.id, isSelected)}
                                isSelected={selectedTasks.has(task.id)} columns={columns} isManager={isManager}
                                onEditTask={() => onEditTask(task)}
                                onDeleteTask={() => deleteTask(task.id)}
                                onViewTask={() => onViewTask(task)}
                                onOpenObservations={() => onOpenObservations(task)}
                                expanded={expandedRows.has(task.id)}
                                onToggleExpand={() => toggleExpand(task.id)} hasSubtasks={task.subtasks && task.subtasks.length > 0}
                            />
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={columns.length + 3} className="h-24 text-center">Nenhuma tarefa encontrada.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TableView;
