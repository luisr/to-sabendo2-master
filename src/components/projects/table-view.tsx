"use client";
import { useState, useMemo, forwardRef, Fragment, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MoreHorizontal, PlusCircle, Settings, Trash2, ChevronRight, Loader2, Printer, Eye, MessageSquare, Edit } from 'lucide-react';
import type { Task, Tag, User } from '@/lib/types';
import { Progress } from '../ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useTableSettings } from '@/hooks/use-table-settings';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReactToPrint } from 'react-to-print';
import TableManagerModal from './table-manager-modal';
import AddTaskModal from './add-task-modal';

// O TaskRow permanece simples, apenas chamando as funções que recebe.
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
                                <DropdownMenuItem onClick={() => onViewTask(task)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenObservations(task)}><MessageSquare className="mr-2 h-4 w-4" />Observações</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEditTask(task)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                )}
            </TableRow>
             {expanded && task.subtasks?.map((subtask: Task) => (
                <TaskRow key={subtask.id} task={subtask} onSelect={() => {}} isSelected={false} columns={columns} isManager={isManager} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onViewTask={onViewTask} onOpenObservations={onOpenObservations} expanded={false} onToggleExpand={() => {}} hasSubtasks={false} />
            ))}
        </Fragment>
    );
};

// **ARQUITETURA CORRIGIDA: Props explícitas para cada ação.**
interface TableViewProps {
    tasks: Task[]; users: User[];
    onAddTask: () => void; // Apenas notifica para abrir o modal.
    onEditTask: (task: Task) => void;
    onViewTask: (task: Task) => void;
    onOpenObservations: (task: Task) => void;
    deleteTask: (taskId: string) => Promise<boolean>;
    loading: boolean; isManager: boolean; selectedProjectId: string | null;
}

const TableView = forwardRef<HTMLDivElement, TableViewProps>(({ tasks, users, onAddTask, onEditTask, onViewTask, onOpenObservations, deleteTask, loading, isManager, selectedProjectId }, ref) => {
    const { tags: allTags, visibleColumns } = useTableSettings();
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState("");
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({ content: () => printRef.current });

    const columns = useMemo(() => [
        { id: 'project_name', name: 'Projeto' }, { id: 'assignee', name: 'Responsável' }, { id: 'status', name: 'Status' },
        { id: 'priority', name: 'Prioridade' }, { id: 'tags', name: 'Tags' }, { id: 'progress', name: 'Progresso' },
        { id: 'start_date', name: 'Início' }, { id: 'end_date', name: 'Fim' },
    ].filter(c => visibleColumns.includes(c.id)), [visibleColumns]);

    const filteredTasks = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        return tasks.filter(task => task.name.toLowerCase().includes(filterText.toLowerCase()) && (filterTags.length === 0 || (task.tags || []).some(tag => tag && filterTags.includes(tag.id))) && !task.parent_id);
    }, [tasks, filterText, filterTags]);

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
    
    const isConsolidatedView = selectedProjectId === 'consolidated';

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2"> {/* Filtros */} </div>
                <div className="flex gap-2">
                    {!isConsolidatedView && isManager && (<Button variant="outline" size="sm" onClick={onAddTask}><PlusCircle className="h-4 w-4 mr-2" />Adicionar Tarefa</Button>)}
                    <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
                    {isManager && (<Button variant="outline" size="sm" onClick={() => setIsManagerModalOpen(true)}><Settings className="h-4 w-4 mr-2" />Gerenciar Tabela</Button>)}
                </div>
            </div>
            
            <div className="border rounded-md overflow-x-auto" ref={ref}>
                <div ref={printRef}>
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
                                        key={task.id} task={task} onSelect={(isChecked: boolean) => handleSelectRow(task.id, isChecked)}
                                        isSelected={selectedTasks.has(task.id)} columns={columns} isManager={isManager}
                                        onEditTask={onEditTask} onDeleteTask={deleteTask} onViewTask={onViewTask}
                                        onOpenObservations={onOpenObservations} expanded={expandedRows.has(task.id)}
                                        onToggleExpand={() => toggleExpand(task.id)} hasSubtasks={task.subtasks && task.subtasks.length > 0}
                                    />
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={columns.length + 3} className="h-24 text-center">Nenhuma tarefa encontrada.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            {/* **NENHUM MODAL DE TAREFA É RENDERIZADO AQUI.** A PÁGINA PAI AGORA É RESPONSÁVEL.*/}
            <TableManagerModal isOpen={isManagerModalOpen} onOpenChange={setIsManagerModalOpen} />
        </>
    );
});
TableView.displayName = "TableView";
export default TableView;
