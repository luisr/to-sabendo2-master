"use client";

import { useEffect, useState } from 'react';
import { FrappeGantt } from 'frappe-gantt-react';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2 } from 'lucide-react';
import type { Task as AppTask } from '@/lib/types';

// Task type for the Frappe Gantt component
interface FrappeTask {
    id: string;
    name: string;
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
    progress: number;
    dependencies?: string; // Comma-separated string of task IDs
}

export default function GanttChart({ selectedProject }: { selectedProject: string | undefined }) {
    console.log("--- [GanttChart Render] ---");
    const { tasks, loading: tasksLoading } = useTasks();
    console.log("[GanttChart] Props recebidas de useTasks:", { tasks, tasksLoading });
    
    const [ganttTasks, setGanttTasks] = useState<FrappeTask[]>([]);
    const [viewMode, setViewMode] = useState('Day');

    useEffect(() => {
        console.log("[GanttChart useEffect] Verificando se deve formatar tarefas...");
        if (!tasksLoading && Array.isArray(tasks)) {
            const formattedTasks: FrappeTask[] = tasks
                .filter(task => task.start_date && task.end_date) // Apenas tarefas com datas
                .map((task: AppTask) => ({
                    id: task.id,
                    name: task.name,
                    start: task.start_date!,
                    end: task.end_date!,
                    progress: task.progress || 0,
                    dependencies: task.dependencies?.join(',') || '',
                }));
            
            console.log("[GanttChart useEffect] Tarefas formatadas para o Gantt:", formattedTasks);
            setGanttTasks(formattedTasks);
        } else {
             console.log("[GanttChart useEffect] Não formatou tarefas. Condições:", { tasksLoading, isArray: Array.isArray(tasks) });
        }
    }, [tasks, tasksLoading]);
    
    if (tasksLoading) {
        console.log("[GanttChart] Renderizando loader porque tasksLoading é true.");
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="w-full h-full gantt-container relative">
            <div className="absolute top-0 right-0 z-10 p-2">
                <select onChange={(e) => setViewMode(e.target.value)} value={viewMode}>
                    <option value="Day">Dia</option>
                    <option value="Week">Semana</option>
                    <option value="Month">Mês</option>
                </select>
            </div>

           {ganttTasks.length > 0 ? (
                <FrappeGantt
                    tasks={ganttTasks}
                    viewMode={viewMode as any}
                    onClick={(task) => console.log("Gantt task clicked:", task)}
                    onDateChange={() => {}}
                    onProgressChange={() => {}}
                />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma tarefa com datas de início e fim para exibir no gráfico de Gantt.
                </div>
            )}
        </div>
    );
}
