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
import { useTags } from "@/hooks/use-tags";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Loader2, PlusCircle, MoreHorizontal } from "lucide-react";
import type { Task, Project } from "@/lib/types";
import AddTaskModal from "@/components/projects/add-task-modal";
import EditTaskModal from "@/components/projects/edit-task-modal";
import ViewTaskModal from "@/components/projects/view-task-modal";
import TaskObservationsModal from "@/components/projects/task-observations-modal";
import TableManagerModal from "@/components/projects/table-manager-modal";
import SetSubtaskModal from "@/components/projects/set-subtask-modal";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddProjectModal from "@/components/projects/add-project-modal";
import EditProjectModal from "@/components/projects/edit-project-modal";
import { AlertModal } from "@/components/shared/alert-modal";
import { DropResult } from "react-beautiful-dnd";
import { useToast } from "@/hooks/use-toast";

const WbsView = dynamic(() => import('@/components/projects/wbs-view'), { ssr: false, loading: () => <Loader2 className="h-8 w-8 animate-spin" /> });
const GanttChartWrapper = dynamic(() => import('@/components/projects/gantt-chart-wrapper'), { ssr: false, loading: () => <Loader2 className="h-8 w-8 animate-spin" /> });

// Tipos
type TaskWithSubtasks = Task & { subtasks?: TaskWithSubtasks[] };

// Função de filtro hierárquico
const filterHierarchicalTasks = (tasks: TaskWithSubtasks[], statusFilter: string, userFilter: string): TaskWithSubtasks[] => {
    return tasks.map(task => {
        const subtasks = task.subtasks ? filterHierarchicalTasks(task.subtasks, statusFilter, userFilter) : [];
        const statusMatch = statusFilter === 'all' || task.status_id === statusFilter;
        const userMatch = userFilter === 'all' || task.assignee_id === userFilter;
        if ((statusMatch && userMatch) || subtasks.length > 0) {
            return { ...task, subtasks };
        }
        return null;
    }).filter((task): task is TaskWithSubtasks => task !== null);
};

const ProjectsPageContent = () => {
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { user, users } = useUsers();
    const { tags } = useTags();
    const { statuses, loading: loadingSettings } = useTableSettings();
    const { tasks, rawTasks, loading: loadingTasks, selectedProjectId, setSelectedProjectId, refetchTasks, addTask, deleteTask, setParentTask, updateTaskStatus, updateTask } = useTasks();
    const { toast } = useToast();

    // Estado para controlar a aba ativa
    const [activeTab, setActiveTab] = useState('table');
    
    // Modais
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToView, setTaskToView] = useState<Task | null>(null);
    const [taskForObservations, setTaskForObservations] = useState<Task | null>(null);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [isSetSubtaskModalOpen, setIsSetSubtaskModalOpen] = useState(false);
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
    
    // Filtros
    const [statusFilter, setStatusFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ content: () => printRef.current });

    const isManager = useMemo(() => user?.role === 'Admin' || user?.role === 'Gerente', [user]);

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) setSelectedProjectId('consolidated');
    }, [projects, selectedProjectId, setSelectedProjectId]);

    const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [selectedProjectId, projects]);
    const isConsolidatedView = selectedProjectId === 'consolidated' || selectedProjectId === null;
    
    // Lógica de filtro unificada
    const filteredKanbanTasks = useMemo(() => rawTasks.filter(task => (statusFilter === 'all' || task.status_id === statusFilter) && (userFilter === 'all' || task.assignee_id === userFilter)), [rawTasks, statusFilter, userFilter]);
    const filteredHierarchicalTasks = useMemo(() => filterHierarchicalTasks(tasks, statusFilter, userFilter), [tasks, statusFilter, userFilter]);

    // Handlers
    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
        await updateTaskStatus(draggableId, destination.droppableId);
        toast({ title: "Status da tarefa atualizado!" });
    };

    const handleSetSubtask = async (parentId: string) => {
        await setParentTask(Array.from(selectedTasks), parentId);
        toast({ title: "Subtarefas definidas!", description: `${selectedTasks.size} tarefas foram re-organizadas.` });
        setSelectedTasks(new Set());
        setIsSetSubtaskModalOpen(false);
    };

    const handleDeleteProject = async () => { /* Implementação... */ };

    const projectActions = ( <div className="flex items-center gap-2"> <ProjectSelector projects={projects} value={selectedProjectId || ''} onValueChange={setSelectedProjectId} showConsolidatedView={true} /> {isManager && ( <> <Button onClick={() => setIsAddProjectModalOpen(true)}> <PlusCircle className="h-4 w-4 mr-2" /> Novo Projeto </Button> {!isConsolidatedView && currentProject && ( <DropdownMenu> <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger> <DropdownMenuContent> <DropdownMenuItem onClick={() => setProjectToEdit(currentProject)}>Editar</DropdownMenuItem> <DropdownMenuItem onClick={() => setIsDeleteProjectModalOpen(true)} className="text-red-500">Excluir</DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> )} </> )} </div> );
    
    if (loadingTasks || loadingSettings) {
        return <div className="flex flex-1 items-center justify-center"> <Loader2 className="h-8 w-8 animate-spin" /> </div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 pb-0">
                <PageHeader title={isConsolidatedView ? "Visão Consolidada" : (currentProject?.name || "Projetos")} actions={projectActions} />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 p-4 pt-2">
                <TabsList className="flex-shrink-0">
                    <TabsTrigger value="table">Tabela</TabsTrigger>
                    <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    <TabsTrigger value="gantt">Gantt</TabsTrigger>
                    <TabsTrigger value="wbs">EAP</TabsTrigger>
                </TabsList>

                {/* Tabela */}
                <TabsContent value="table" className="flex-1 flex flex-col min-h-0 mt-2">
                   <TableHeaderActions {...{isManager, isConsolidatedView, statuses, users, statusFilter, userFilter, selectedTasks}} onAddTask={() => setIsAddTaskModalOpen(true)} onPrint={handlePrint} onOpenManager={() => setIsManagerModalOpen(true)} onSetSubtask={() => setIsSetSubtaskModalOpen(true)} isLoading={!printRef.current} onStatusChange={setStatusFilter} onUserChange={setUserFilter} />
                    <TableView ref={printRef} {...{tasks: filteredHierarchicalTasks, users, deleteTask, isManager, selectedTasks, setSelectedTasks}} onEditTask={setTaskToEdit} onViewTask={setTaskToView} onOpenObservations={setTaskForObservations} loading={loadingTasks} currentUserId={user?.id} />
                </TabsContent>

                {/* Kanban */}
                <TabsContent value="kanban" className="flex-1 min-h-0 mt-2">
                    <KanbanBoard tasks={filteredKanbanTasks} statuses={statuses} onDragEnd={handleDragEnd} loading={loadingTasks || loadingSettings} onEditTask={setTaskToEdit} />
                </TabsContent>

                {/* Gantt e EAP com `key` para forçar a remontagem */}
                <TabsContent value="gantt" className="flex-1 overflow-y-auto mt-2">
                   <GanttChartWrapper key={selectedProjectId} tasks={filteredHierarchicalTasks} isConsolidated={isConsolidatedView} />
                </TabsContent>
                <TabsContent value="wbs" className="flex-1 overflow-y-auto mt-2">
                    <WbsView key={selectedProjectId} tasks={filteredHierarchicalTasks} isConsolidated={isConsolidatedView} />
                </TabsContent>
            </Tabs>
            
            {/* Modais */}
            <AddTaskModal isOpen={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen} onSave={addTask} selectedProject={selectedProjectId || ''} statuses={statuses} users={users} tasks={rawTasks} tags={tags} />
            {taskToEdit && ( <EditTaskModal key={`edit-${taskToEdit.id}`} isOpen={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)} onTaskUpdate={(updatedTask) => updateTask(taskToEdit.id, updatedTask)} task={taskToEdit} statuses={statuses} users={users} tasks={rawTasks} tags={tags} /> )}
            {taskToView && ( <ViewTaskModal key={`view-${taskToView.id}`} isOpen={!!taskToView} onOpenChange={() => setTaskToView(null)} task={taskToView} /> )}
            {taskForObservations && ( <TaskObservationsModal key={`obs-${taskForObservations.id}`} isOpen={!!taskForObservations} onOpenChange={() => setTaskForObservations(null)} task={taskForObservations} /> )}
            <TableManagerModal isOpen={isManagerModalOpen} onOpenChange={setIsManagerModalOpen} />
            <SetSubtaskModal isOpen={isSetSubtaskModalOpen} onOpenChange={() => setIsSetSubtaskModalOpen(false)} tasks={rawTasks.filter(t => !selectedTasks.has(t.id))} onSetParent={handleSetSubtask} />
            <AddProjectModal isOpen={isAddProjectModalOpen} onOpenChange={setIsAddProjectModalOpen} onSave={addProject} />
            {projectToEdit && <EditProjectModal isOpen={!!projectToEdit} onOpenChange={() => setProjectToEdit(null)} onSave={updateProject} project={projectToEdit} />}
            <AlertModal isOpen={isDeleteProjectModalOpen} onClose={() => setIsDeleteProjectModalOpen(false)} onConfirm={handleDeleteProject} title="Excluir Projeto" description={`Tem certeza que deseja excluir o projeto "${currentProject?.name}"? Todas as tarefas associadas serão perdidas.`} />
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
