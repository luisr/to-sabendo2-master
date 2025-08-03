
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import dynamic from 'next/dynamic';
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, DollarSign, ListTodo, Zap, Edit, Trash2, MoreVertical, Download, Upload, Sparkles, PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableView from "@/components/projects/table-view";
import KanbanBoard from "@/components/projects/kanban-board";
import GanttChart from "@/components/projects/gantt-chart";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useCollaborators } from "@/hooks/use-collaborators";
import { useUsers } from "@/hooks/use-users";
import ManageCollaboratorsModal from "@/components/projects/manage-collaborators-modal";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import KpiCard from "@/components/dashboard/kpi-card";
import OverviewChart from "@/components/dashboard/overview-chart";
import RecentTasksCard from "@/components/dashboard/recent-tasks-card";
import { Loader2 } from "lucide-react";
import AddProjectModal from "@/components/projects/add-project-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const WbsView = dynamic(() => import('@/components/projects/wbs-view'), { ssr: false });

// Visão Consolidada para o Admin
const ConsolidatedView = () => {
    const { data, loading } = useAdminDashboard();
    if (loading || !data) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    const { kpis, recentProjects, recentTasks, tasksByStatus } = data;

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Orçamento Total" value={`R$ ${(kpis.total_budget || 0).toLocaleString('pt-BR')}`} icon={<DollarSign />} change="" />
                <KpiCard title="Projetos Ativos" value={String(kpis.total_projects || 0)} icon={<ListTodo />} change="" />
                <KpiCard title="Progresso Geral" value={`${Math.round(kpis.overall_progress || 0)}%`} icon={<CheckCircle />} change="" />
                <KpiCard title="Tarefas em Risco" value={String(kpis.tasks_at_risk || 0)} icon={<Zap />} change="" valueClassName="text-destructive" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <OverviewChart data={tasksByStatus || []} />
                <RecentProjectsCard projects={recentProjects || []} />
            </div>
        </div>
    );
};


const AdminProjectsPageContent = () => {
  const [selectedProject, setSelectedProject] = useState<string>("consolidated");
  const [activeTab, setActiveTab] = useState("table");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);

  const { projects, loading: projectsLoading, addProject, updateProject } = useProjects();
  const { addTasksBatch, setSelectedProjectId } = useTasks();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedProjectId(selectedProject === 'consolidated' ? null : selectedProject);
  }, [selectedProject, setSelectedProjectId]);

  const handleOpenModal = (project: any = null) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };
  
  const handleSaveProject = async (data: any) => { /* ... (mesma lógica de salvar do gerente) ... */ };

  if (projectsLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const projectSelectorOptions = [{ id: 'consolidated', name: 'Visão Consolidada' }, ...projects];

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        <PageHeader
          title="Projetos (Admin)"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ProjectSelector projects={projectSelectorOptions} value={selectedProject} onValueChange={setSelectedProject} />
              <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2 h-4 w-4" />Novo Projeto</Button>
            </div>
          }
        />
        
        {selectedProject === 'consolidated' ? (
            <ConsolidatedView />
        ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
                <TabsList>
                    <TabsTrigger value="table">Tabela</TabsTrigger>
                    <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    <TabsTrigger value="gantt">Gantt</TabsTrigger>
                    <TabsTrigger value="wbs">EAP</TabsTrigger>
                </TabsList>
                <TabsContent value="table" className="flex-1"><TableView /></TabsContent>
                <TabsContent value="kanban" className="flex-1"><KanbanBoard /></TabsContent>
                <TabsContent value="gantt" className="flex-1"><GanttChart selectedProject={selectedProject} /></TabsContent>
                <TabsContent value="wbs" className="flex-1"><WbsView selectedProject={selectedProject || ''} /></TabsContent>
            </Tabs>
        )}

      </div>
      <AddProjectModal
        isOpen={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
        onSaveProject={handleSaveProject}
        projectToEdit={projectToEdit}
      />
    </>
  );
}


export default function AdminProjectsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <AdminProjectsPageContent />
        </Suspense>
    )
}
