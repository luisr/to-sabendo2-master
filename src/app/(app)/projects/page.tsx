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

const WbsView = dynamic(() => import('@/components/projects/wbs-view'), { ssr: false });
const GanttChartWrapper = dynamic(() => import('@/components/projects/gantt-chart-wrapper'), { ssr: false });

const filterTasks = (tasks: Task[], statusFilter: string, userFilter: string): Task[] => {
    if (statusFilter === 'all' && userFilter === 'all') return tasks;
    return tasks.reduce((acc: Task[], task) => {
        const statusMatch = statusFilter === 'all' || task.status_id === statusFilter;
        const userMatch = userFilter === 'all' || task.assignee_id === userFilter;
        const selfMatch = statusMatch && userMatch;
        const filteredSubtasks = task.subtasks ? filterTasks(task.subtasks, statusFilter, userFilter) : [];
        if (selfMatch || filteredSubtasks.length > 0) {
            acc.push({ ...task, subtasks: filteredSubtasks });
        }
        return acc;
    }, []);
};

const ProjectsPageContent = () => {
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { user, users } = useUsers();
    const { tags } = useTags();
    const { statuses } = useTableSettings();
    const { tasks, loading: loadingTasks, selectedProjectId, setSelectedProjectId, refetchTasks, addTask, deleteTask, setParentTask } = useTasks();
    
    // Modals de Tarefa
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToView, setTaskToView] = useState<Task | null>(null);
    const [taskForObservations, setTaskForObservations] = useState<Task | null>(null);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [isSetSubtaskModalOpen, setIsSetSubtaskModalOpen] = useState(false);

    // Modals de Projeto
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);

    const [statusFilter, setStatusFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ content: () => printRef.current });

    const isManager = useMemo(() => user?.role === 'Admin' || user?.role === 'Gerente', [user]);

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId('consolidated');
        }
    }, [projects, selectedProjectId, setSelectedProjectId]);

    const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [selectedProjectId, projects]);
    const isConsolidatedView = selectedProjectId === 'consolidated' || selectedProjectId === null;
    
    const filteredTasks = useMemo(() => filterTasks(tasks, statusFilter, userFilter), [tasks, statusFilter, userFilter]);

    const handleSetSubtask = async (parentId: string) => {
        await setParentTask(Array.from(selectedTasks), parentId);
        setSelectedTasks(new Set());
        setIsSetSubtaskModalOpen(false);
        refetchTasks();
    };
    
    const handleDeleteProject = async () => {
        if (currentProject) {
            await deleteProject(currentProject.id);
            setSelectedProjectId('consolidated');
            setIsDeleteProjectModalOpen(false);
        }
    };

    const projectActions = (
        <div className="flex items-center gap-2">
            <ProjectSelector projects={projects} value={selectedProjectId || ''} onValueChange={setSelectedProjectId} showConsolidatedView={true} />
            {isManager && (
                <>
                    <Button onClick={() => setIsAddProjectModalOpen(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Novo Projeto
                    </Button>
                    {!isConsolidatedView && currentProject && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setProjectToEdit(currentProject)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsDeleteProjectModalOpen(true)} className="text-red-500">Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-4 h-full">
            <PageHeader
                title={isConsolidatedView ? "Visão Consolidada" : (currentProject?.name || "Projetos")}
                actions={projectActions}
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
                           onSetSubtask={() => setIsSetSubtaskModalOpen(true)}
                           isLoading={!printRef.current}
                           selectedTasks={selectedTasks}
                           statuses={statuses}
                           users={users}
                           statusFilter={statusFilter}
                           onStatusChange={setStatusFilter}
                           userFilter={userFilter}
                           onUserChange={setUserFilter}
                       />
                       <TableView 
                           printSectionRef={printRef}
                           tasks={filteredTasks}
                           users={users}
                           onEditTask={setTaskToEdit}
                           onViewTask={setTaskToView}
                           onOpenObservations={setTaskForObservations}
                           deleteTask={deleteTask}
                           loading={loadingTasks} 
                           isManager={isManager}
                           currentUserId={user?.id}
                           selectedTasks={selectedTasks}
                           setSelectedTasks={setSelectedTasks}
                       />
                    </TabsContent>
                    <TabsContent value="board" className="flex-1 overflow-y-auto"><KanbanBoard tasks={filteredTasks} statuses={statuses} onDragEnd={() => {}} loading={loadingTasks} /></TabsContent>
                   <TabsContent value="gantt" className="flex-1 overflow-y-auto">{!isConsolidatedView && selectedProjectId && <GanttChartWrapper selectedProject={selectedProjectId} />}</TabsContent>
                    <TabsContent value="wbs" className="flex-1 overflow-y-auto">{!isConsolidatedView && <WbsView tasks={tasks} />}</TabsContent>
                </Tabs>
            )}

            <AddTaskModal isOpen={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen} onSave={addTask} selectedProject={selectedProjectId || ''} statuses={statuses} users={users} tasks={tasks} tags={tags} />
            {taskToEdit && ( <EditTaskModal key={`edit-${taskToEdit.id}`} isOpen={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)} onTaskUpdate={refetchTasks} task={taskToEdit} statuses={statuses} users={users} tasks={tasks} tags={tags} /> )}
            {taskToView && ( <ViewTaskModal key={`view-${taskToView.id}`} isOpen={!!taskToView} onOpenChange={() => setTaskToView(null)} task={taskToView} /> )}
            {taskForObservations && ( <TaskObservationsModal key={`obs-${taskForObservations.id}`} isOpen={!!taskForObservations} onOpenChange={() => setTaskForObservations(null)} task={taskForObservations} /> )}
            <TableManagerModal isOpen={isManagerModalOpen} onOpenChange={setIsManagerModalOpen} />
            <SetSubtaskModal isOpen={isSetSubtaskModalOpen} onOpenChange={setIsSetSubtaskModalOpen} tasks={tasks.filter(t => !selectedTasks.has(t.id))} onSetParent={handleSetSubtask} />
            
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
