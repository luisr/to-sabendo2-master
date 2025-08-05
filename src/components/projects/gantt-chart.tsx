"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { FrappeGantt } from 'frappe-gantt-react';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2, GitBranch, ChevronsUpDown } from 'lucide-react';
import type { Task as AppTask, Baseline, BaselineTask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { startOfToday, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import SetBaselineModal from './set-baseline-modal';
import { supabase } from '@/lib/supabase';
import './gantt-chart.css'; 

// Tipos
interface FrappeTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
}
type TaskNode = AppTask & { children: TaskNode[] };
type TimeFilterOption = 'all' | 'month' | 'quarter' | 'year';


// Função para construir a árvore de tarefas
const buildTaskTree = (tasks: AppTask[]): TaskNode[] => {
    if (!tasks || tasks.length === 0) return [];

    const tasksWithChildren: TaskNode[] = JSON.parse(JSON.stringify(tasks)).map((t: AppTask) => ({ ...t, children: [] }));
    const taskMap = new Map(tasksWithChildren.map(t => [t.id, t]));
    const rootTasks: TaskNode[] = [];

    tasksWithChildren.forEach(task => {
        if (task.parent_id && taskMap.has(task.parent_id)) {
            const parent = taskMap.get(task.parent_id)!;
            if (!parent.children) parent.children = [];
            parent.children.push(task);
        } else {
            rootTasks.push(task);
        }
    });
    return rootTasks;
};

// Função para achatar a árvore de tarefas para o formato Frappe
const flattenTaskTree = (taskTree: TaskNode[]): FrappeTask[] => {
    const flattened: FrappeTask[] = [];
    const traverse = (tasks: TaskNode[], level: number) => {
        tasks.forEach(task => {
            if (task.start_date && task.end_date) {
                flattened.push({
                    id: task.id,
                    name: task.name,
                    start: task.start_date,
                    end: task.end_date,
                    progress: task.progress || 0,
                    dependencies: task.dependencies?.join(',') || '',
                    custom_class: `gantt-level-${level}` // Classe para estilização hierárquica
                });
                if (task.children && task.children.length > 0) {
                    traverse(task.children, level + 1);
                }
            }
        });
    };
    traverse(taskTree, 0);
    return flattened;
};

export default function GanttChart({ selectedProject }: { selectedProject: string | undefined }) {
    const { tasks, loading: tasksLoading } = useTasks();
    const [ganttTasks, setGanttTasks] = useState<FrappeTask[]>([]);
    const [viewMode, setViewMode] = useState('Week');
    const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('all');
    const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
    
    // Estados para Linha de Base
    const [baselines, setBaselines] = useState<Baseline[]>([]);
    const [selectedBaseline, setSelectedBaseline] = useState<Baseline | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const ganttRef = useRef<any>(null);

    // Carregar linhas de base
    useEffect(() => {
        async function fetchBaselines() {
            if (!selectedProject) return;
            const { data, error } = await supabase.from('project_baselines').select(`*, baseline_tasks(*)`).eq('project_id', selectedProject).order('created_at', { ascending: false });
            if (error) console.error('Erro ao buscar linhas de base:', error);
            else setBaselines(data as Baseline[]);
        }
        fetchBaselines();
    }, [selectedProject]);

    // Filtrar tarefas por tempo
    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        if (timeFilter === 'all') return tasks;
        const today = startOfToday();
        let interval: Interval;
        switch (timeFilter) {
            case 'month': interval = { start: startOfMonth(today), end: endOfMonth(today) }; break;
            case 'quarter': interval = { start: startOfQuarter(today), end: endOfQuarter(today) }; break;
            case 'year': interval = { start: startOfYear(today), end: endOfYear(today) }; break;
            default: return tasks;
        }
        return tasks.filter(task => task.start_date && isWithinInterval(new Date(task.start_date), interval));
    }, [tasks, timeFilter]);

    // Formatar tarefas para o Gantt
    useEffect(() => {
        if (!tasksLoading && Array.isArray(filteredTasks)) {
            const taskTree = buildTaskTree(filteredTasks);
            const formattedTasks = flattenTaskTree(taskTree);
            setGanttTasks(formattedTasks);
        }
    }, [filteredTasks, tasksLoading]);
    
    if (tasksLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="w-full h-full gantt-container relative" ref={ganttRef}>
            {/* Controles */}
             <div className="absolute top-2 right-2 z-20 flex flex-wrap items-center gap-4 p-2 bg-background/80 rounded-md shadow-md">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={popoverOpen} className="w-[200px] justify-between">
                            {selectedBaseline ? selectedBaseline.name : "Ver Linha de Base"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar linha de base..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma encontrada.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem onSelect={() => setSelectedBaseline(null)}>Nenhuma</CommandItem>
                                    {baselines.map((b) => (<CommandItem key={b.id} onSelect={() => { setSelectedBaseline(b); setPopoverOpen(false); }}>{b.name}</CommandItem>))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button variant="outline" size="sm" onClick={() => setIsBaselineModalOpen(true)}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Definir Linha de Base
                </Button>
            </div>

           {ganttTasks.length > 0 ? (
                <div className="mt-16 gantt-chart-area">
                    <FrappeGantt tasks={ganttTasks} viewMode={viewMode as any} />
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma tarefa encontrada.
                </div>
            )}

            <SetBaselineModal isOpen={isBaselineModalOpen} onClose={() => setIsBaselineModalOpen(false)} selectedProject={selectedProject} />
        </div>
    );
}
