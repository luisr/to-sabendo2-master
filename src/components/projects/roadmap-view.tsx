
"use client"
import { useMemo } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { useTasks } from '@/hooks/use-tasks';
import { Loader2 } from 'lucide-react';
import { addMonths, startOfYear, endOfYear, format } from 'date-fns';

interface RoadmapViewProps {
  selectedProject: string;
  userRole?: 'admin' | 'manager';
}

export default function RoadmapView({ selectedProject }: RoadmapViewProps) {
    const { tasks, loading } = useTasks();
    
    const roadmapTasks = useMemo(() => {
        const tasksToDisplay = tasks || [];
        // The roadmap view often focuses on high-level items like milestones
        return tasksToDisplay
            .filter(task => task.milestone)
            .map(task => ({
                start: new Date(task.start_date),
                end: new Date(task.end_date),
                name: task.name,
                id: task.id,
                progress: task.progress || 0,
                type: 'milestone',
                project: task.project_id,
                 styles: { 
                    backgroundColor: '#fde047',
                    backgroundSelectedColor: '#facc15',
                    progressColor: '#ca8a04', 
                    progressSelectedColor: '#a16207'
                },
            }));
    }, [tasks]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2">Carregando roadmap...</span>
            </div>
        )
    }

    // Customizing the timeline for a yearly/quarterly view
    const columnWidth = 150;
    const today = new Date();
    
    return (
        <div className="w-full h-full overflow-y-auto border rounded-lg bg-card p-4">
           {roadmapTasks.length > 0 ? (
                <Gantt
                    tasks={roadmapTasks}
                    viewMode={ViewMode.Month} // Month view is good for roadmaps
                    listCellWidth=""
                    ganttHeight={600}
                    columnWidth={columnWidth}
                    preStepsCount={1}
                />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum marco para exibir no roadmap.
                </div>
            )}
        </div>
    );
}
