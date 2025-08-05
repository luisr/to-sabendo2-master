"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import Gantt from 'frappe-gantt';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2, GitBranch, ChevronsUpDown } from 'lucide-react';
import type { Task as AppTask, Baseline } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import SetBaselineModal from './set-baseline-modal';
import { supabase } from '@/lib/supabase';
import { startOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, addMonths, startOfYear, endOfYear, isWithinInterval, parseISO, differenceInHours } from 'date-fns';
import './gantt-chart.css';

// --- Tipos e Interfaces ---
interface FrappeTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
}
type TaskNode = AppTask & { children?: TaskNode[], subtasks?: TaskNode[] };
type ViewMode = "Day" | "Week" | "Month";
type TimeFilter = 'all' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

// --- Funções Auxiliares ---
const getInterval = (filter: TimeFilter): Interval | null => {
    const today = startOfToday();
    switch (filter) {
        case 'week': return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
        case 'month': return { start: startOfMonth(today), end: endOfMonth(today) };
        case 'quarter': return { start: startOfQuarter(today), end: endOfQuarter(today) };
        case 'semester': return { start: startOfToday(), end: addMonths(today, 6) };
        case 'year': return { start: startOfYear(today), end: endOfYear(today) };
        default: return null;
    }
};

const filterTasksByInterval = (tasks: TaskNode[], interval: Interval): TaskNode[] => {
    const results: TaskNode[] = [];
    tasks.forEach(task => {
        const children = task.subtasks || task.children || [];
        const filteredChildren = filterTasksByInterval(children, interval);
        const taskStarts = task.start_date ? parseISO(task.start_date) : null;
        const taskEnds = task.end_date ? parseISO(task.end_date) : null;
        const isInInterval = (taskStarts && isWithinInterval(taskStarts, interval)) || (taskEnds && isWithinInterval(taskEnds, interval));
        if (isInInterval || filteredChildren.length > 0) {
            results.push({ ...task, children: filteredChildren });
        }
    });
    return results;
};

// --- Componente Principal ---
export default function GanttChart({ tasks, isConsolidated }: { tasks: TaskNode[], isConsolidated: boolean }) {
    const { loading: tasksLoading } = useTasks();
    const [viewMode, setViewMode] = useState<ViewMode>('Week');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const ganttRef = useRef<HTMLDivElement>(null);
    const todayLineRef = useRef<HTMLDivElement>(null);

    const toggleNode = (nodeId: string) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) newSet.delete(nodeId);
            else newSet.add(nodeId);
            return newSet;
        });
    };
    
    const filteredTasks = useMemo(() => {
        const interval = getInterval(timeFilter);
        return interval ? filterTasksByInterval(tasks, interval) : tasks;
    }, [tasks, timeFilter]);

    const ganttTasks = useMemo(() => {
        const flattened: FrappeTask[] = [];
        const processNode = (node: TaskNode | { id: string, name: string, children: TaskNode[], project_name?: string }, level: number, isProjectHeader = false) => {
            const nodeId = node.id;
            const children = (node as any).subtasks || node.children || [];
            if (flattened.find(t => t.id === nodeId)) return;
            const isCollapsed = collapsedNodes.has(nodeId);
            const icon = children.length > 0 ? (isCollapsed ? '▶' : '▼') : '';
            flattened.push({
                id: nodeId,
                name: `${icon} ${node.name || 'Nome indefinido'}`,
                start: (node as TaskNode).start_date || '',
                end: (node as TaskNode).end_date || '',
                progress: (node as TaskNode).progress || 0,
                dependencies: (node as TaskNode).dependencies?.join(',') || '',
                custom_class: isProjectHeader ? 'gantt-project-header' : `gantt-level-${level}`
            });
            if (!isCollapsed && children.length > 0) {
                children.forEach(child => processNode(child, level + 1));
            }
        };
        if (isConsolidated) {
            const tasksByProject = filteredTasks.reduce((acc, task) => {
                const projId = `proj_${task.project_id}`;
                if (!acc[projId]) acc[projId] = { id: projId, name: task.project_name || 'Projeto Desconhecido', children: [] };
                acc[projId].children.push(task);
                return acc;
            }, {} as Record<string, { id: string, name: string, children: TaskNode[] }>);
            Object.values(tasksByProject).forEach(proj => processNode(proj, 0, true));
        } else {
            filteredTasks.forEach(task => processNode(task, 0));
        }
        return flattened;
    }, [filteredTasks, isConsolidated, collapsedNodes]);

    useEffect(() => {
        if (ganttRef.current && ganttTasks.length > 0) {
            ganttRef.current.innerHTML = "";
            const gantt = new Gantt(ganttRef.current, ganttTasks, {
                header_height: 50,
                column_width: 30,
                step: 24,
                view_modes: ['Day', 'Week', 'Month'],
                bar_height: 20,
                bar_corner_radius: 3,
                arrow_curve: 5,
                padding: 18,
                view_mode: viewMode,
                date_format: 'YYYY-MM-DD',
                on_click: (task) => toggleNode(task.id),
            });
            
            const today = new Date();
            const ganttStartDate = gantt.gantt_start ? new Date(gantt.gantt_start) : null;

            if (ganttStartDate && today >= ganttStartDate) {
                const columnWidth = gantt.options.column_width;
                const hoursPerStep = gantt.options.step;
                const pixelsPerHour = columnWidth / hoursPerStep;
                const hoursFromStart = differenceInHours(today, ganttStartDate);
                const leftPos = hoursFromStart * pixelsPerHour;
                
                if (todayLineRef.current) {
                    todayLineRef.current.style.left = `${leftPos}px`;
                    todayLineRef.current.style.display = 'block';
                }
            } else if (todayLineRef.current) {
                 todayLineRef.current.style.display = 'none';
            }
        }

        return () => {
            if (ganttRef.current) {
                ganttRef.current.innerHTML = "";
            }
        };
    }, [ganttTasks, viewMode]);

    return (
        <div className="w-full h-full gantt-container flex flex-col">
            <div className="p-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Período:</span>
                    {(['all', 'week', 'month', 'quarter', 'semester', 'year'] as TimeFilter[]).map(filter => (
                        <Button key={filter} size="sm" variant={timeFilter === filter ? 'default' : 'outline'} onClick={() => setTimeFilter(filter)}>
                           {{'all': 'Ver Tudo', 'week': 'Semana', 'month': 'Mês', 'quarter': 'Trimestre', 'semester': 'Semestre', 'year': 'Ano'}[filter]}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-auto relative">
                {tasksLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : ganttTasks.length > 0 ? (
                    <>
                        <div ref={ganttRef} className="gantt-chart-area"></div>
                        <div ref={todayLineRef} className="gantt-today-line" style={{display: 'none'}}></div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                       Nenhuma tarefa para exibir no período selecionado.
                    </div>
                )}
            </div>
        </div>
    );
}
