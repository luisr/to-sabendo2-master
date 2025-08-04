"use client";
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import dynamic from 'next/dynamic';
import { useReactToPrint } from 'react-to-print';
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableView from "@/components/projects/table-view";
import KanbanBoard from "@/components/projects/kanban-board";
import TableHeaderActions from "@/components/projects/table-header-actions";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useUsers } from "@/hooks/use-users";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Loader2 } from "lucide-react";
import type { Task } from "@/lib/types";
import AddTaskModal from "@/components/projects/add-task-modal";
import EditTaskModal from "@/components/projects/edit-task-modal";
import ViewTaskModal from "@/components/projects/view-task-modal";
import TaskObservationsModal from "@/components/projects/task-observations-modal";
import TableManagerModal from "@/components/projects/table-manager-modal";

const WbsView = dynamic(() => import('@/components/projects/wbs-view'), { ssr: false });
const GanttChartWrapper = dynamic(() => import('@/components/projects/gantt-chart-wrapper'), { ssr: false });

const ProjectsPageContent = () => {
    const { projects } = useProjects();
    const { user, users } = useUsers();
    const { statuses } = useTableSettings();
    const { tasks, loading: loadingTasks, selectedProjectId, setSelectedProjectId, addTask, updateTask, deleteTask } = useTasks();
    
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToView, setTaskToView] = useState<Task | null>(null);
    const [taskForObservations, setTaskForObservations] = useState<Task | null>(null);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    
    const printRef = useRef<HTMLDivElement>(null);
    const [isRefReady, setRefReady] = useState(false);

    const callbackRef = (node: HTMLDivElement | null) => {
        if (node) {
            (printRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            setRefReady(true);
        } else {
            (printRef as React.MutableRefObject<HTMLDivElement | null>).current = null;
            setRefReady(false);
        }
    };
    
    const handlePrint = useReactToPrint({ content: () => printRef.current });

    const isManager = useMemo(() => user?.role === 'Admin' || user?.role === 'Gerente', [user]);

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId('consolidated');
        }
    }, [projects, selectedProjectId, setSelectedProjectId]);
    
    const handleUpdateTask = (taskData: Partial<Task> & { id: string }) => {
        updateTask(taskData.id, taskData);
        setTaskToEdit(null);
    };

    const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [selectedProjectId, projects]);
    const isConsolidatedView = selectedProjectId === 'consolidated';

    return (
        <div className="flex flex-col gap-4 h-full">
            <PageHeader
                title={isConsolidatedView ? "Visão Consolidada" : (currentProject?.name || "Projetos")}
                actions={<div className="flex items-center gap-2"><ProjectSelector projects={projects} value={selectedProjectId || ''} onValueChange={setSelectedProjectId} showConsolidatedView={true} /></div>}
            />

            {loadingTasks ? (
                 <div className="flex flex-1 items-center justify-center"> <Loader2 className="h-8 w-8 animate-spin" /> </div>
            ) : (
                <Tabs defaultValue="table" className="flex flex-col flex-1">
                    <TabsList>
                        <TabsTrigger value="table">Tabela</TabsTrigger>
                        <TabsTrigger value="board">Kanban</TabsTrigger>
                        <TabsTrigger value="gantt" disabled={isConsolidatedView}>Gantt</TabsTrigger>
                        <TabsTrigger value="wbs" disabled={isConsolidatedView}>EAP</TabsTrigger>
                    </TabsList>
                    <TabsContent value="table" className="flex-1 flex flex-col">
                       <TableHeaderActions
                           isManager={isManager}
                           isConsolidatedView={isConsolidatedView}
                           onAddTask={() => setIsAddTaskModalOpen(true)}
                           onPrint={handlePrint}
                           onOpenManager={() => setIsManagerModalOpen(true)}
                           isLoading={!isRefReady}
                       />
                       <TableView 
                           printSectionRef={callbackRef}
                           tasks={tasks} users={users}
                           onEditTask={setTaskToEdit}
                           onViewTask={setTaskToView}
                           onOpenObservations={setTaskForObservations}
                           deleteTask={deleteTask}
                           loading={loadingTasks} isManager={isManager}
                       />
                    </TabsContent>
                    <TabsContent value="board" className="flex-1 overflow-y-auto"><KanbanBoard tasks={tasks} statuses={statuses} onDragEnd={() => {}} loading={loadingTasks} /></TabsContent>
                   <TabsContent value="gantt" className="flex-1 overflow-y-auto">{!isConsolidatedView && selectedProjectId && <GanttChartWrapper selectedProject={selectedProjectId} />}</TabsContent>
                    <TabsContent value="wbs" className="flex-1 overflow-y-auto">{!isConsolidatedView && <WbsView tasks={tasks} />}</TabsContent>
                </Tabs>
            )}

            <AddTaskModal isOpen={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen} onSave={addTask} selectedProject={selectedProjectId || ''} statuses={statuses} users={users} tasks={tasks} />
            {taskToEdit && ( <EditTaskModal key={`edit-${taskToEdit.id}`} isOpen={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)} onSave={handleUpdateTask} task={taskToEdit} statuses={statuses} users={users} tasks={tasks} /> )}
            {taskToView && ( <ViewTaskModal key={`view-${taskToView.id}`} isOpen={!!taskToView} onOpenChange={() => setTaskToView(null)} task={taskToView} /> )}
            {taskForObservations && ( <TaskObservationsModal key={`obs-${taskForObservations.id}`} isOpen={!!taskForObservations} onOpenChange={() => setTaskForObservations(null)} task={taskForObservations} /> )}
            <TableManagerModal isOpen={isManagerModalOpen} onOpenChange={setIsManagerModalOpen} />
        </div>
    );
}

export default function ProjectsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <ProjectsPageContent />
        </Suspense>
    )
}
