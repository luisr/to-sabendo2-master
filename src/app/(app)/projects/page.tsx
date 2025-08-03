"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import dynamic from 'next/dynamic';
import { DropResult } from 'react-beautiful-dnd';
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { Button } from "@/components/ui/button";
import { MoreVertical, PlusCircle, Download, Users, Trash2, BrainCircuit, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableView from "@/components/projects/table-view";
import KanbanBoard from "@/components/projects/kanban-board";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useUsers } from "@/hooks/use-users";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useCollaborators } from "@/hooks/use-collaborators";
import { Loader2 } from "lucide-react";
import AddProjectModal from "@/components/projects/add-project-modal";
import EditTaskModal from "@/components/projects/edit-task-modal"; // Adicionar importação
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Task, Project } from "@/lib/types";
// ... (outras importações omitidas)

const WbsView = dynamic(() => import('@/components/projects/wbs-view'), { ssr: false });
const GanttChartWrapper = dynamic(() => import('@/components/projects/gantt-chart-wrapper'), { ssr: false });

const ProjectsPageContent = () => {
    const { projects } = useProjects();
    const { user, users } = useUsers();
    const { statuses } = useTableSettings();
    const { tasks, loading: loadingTasks, selectedProjectId, setSelectedProjectId } = useTasks();
    
    const [isAddProjectModalOpen, setAddProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isEditTaskModalOpen, setEditTaskModalOpen] = useState(false); // Adicionar estado
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);     // Adicionar estado

    const isManager = useMemo(() => user?.role === 'Admin' || user?.role === 'Gerente', [user]);

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId('consolidated');
        }
    }, [projects, selectedProjectId, setSelectedProjectId]);
    
    const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [selectedProjectId, projects]);
    const shouldRenderContent = (selectedProjectId && currentProject) || selectedProjectId === 'consolidated';
    
    // CORREÇÃO: Adicionando a função de volta
    const handleOpenEditModal = (task: Task) => {
        setTaskToEdit(task);
        setEditTaskModalOpen(true);
    };

    const handleOpenEditProjectModal = () => {
        if (currentProject) {
            setProjectToEdit(currentProject);
            setAddProjectModalOpen(true);
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <PageHeader
                title={selectedProjectId === 'consolidated' ? "Visão Consolidada" : (currentProject?.name || "Projetos")}
                actions={
                    <div className="flex items-center gap-2">
                         <ProjectSelector projects={projects} value={selectedProjectId || ''} onValueChange={setSelectedProjectId} showConsolidatedView={true} />
                         {/* ... (outros botões) ... */}
                    </div>
                }
            />

            {shouldRenderContent ? (
                 <Tabs defaultValue="table" className="flex flex-col flex-1">
                    <TabsList>
                        <TabsTrigger value="table">Tabela</TabsTrigger>
                        <TabsTrigger value="board">Kanban</TabsTrigger>
                        <TabsTrigger value="gantt">Gantt</TabsTrigger>
                        <TabsTrigger value="wbs">EAP</TabsTrigger>
                    </TabsList>
                    <TabsContent value="table" className="flex-1 overflow-y-auto">
                       <TableView tasks={tasks as Task[]} onEditTask={handleOpenEditModal} onAddTask={() => {}} onDeleteSelected={() => {}} loading={loadingTasks} isManager={isManager} selectedTasks={new Set()} setSelectedTasks={() => {}} />
                    </TabsContent>
                    <TabsContent value="board" className="flex-1 overflow-y-auto">
                        <KanbanBoard tasks={tasks} statuses={statuses} onDragEnd={() => {}} loading={loadingTasks} />
                    </TabsContent>
                    <TabsContent value="gantt" className="flex-1 overflow-y-auto">
                        <GanttChartWrapper selectedProject={selectedProjectId} />
                    </TabsContent>
                    <TabsContent value="wbs" className="flex-1 overflow-y-auto">
                        <WbsView tasks={tasks} />
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-4 text-center">
                    {/* ... */}
                </div>
            )}

            <AddProjectModal 
                isOpen={isAddProjectModalOpen} 
                onOpenChange={(isOpen) => {
                    setAddProjectModalOpen(isOpen);
                    if (!isOpen) setProjectToEdit(null);
                }} 
                onSaveProject={() => {}} 
                projectToEdit={projectToEdit}
            />
            {taskToEdit && (
                <EditTaskModal 
                    isOpen={isEditTaskModalOpen} 
                    onOpenChange={setEditTaskModalOpen} 
                    onSave={() => {}}
                    task={taskToEdit}
                    statuses={statuses}
                    users={users}
                    tasks={tasks}
                />
            )}
            {/* ... (outros modais) ... */}
        </div>
    );
}

export default function ProjectsPage() {
    return <Suspense fallback={<div>Carregando...</div>}>
        <ProjectsPageContent />
    </Suspense>
}