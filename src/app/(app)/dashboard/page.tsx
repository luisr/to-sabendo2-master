
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import KpiCard from "@/components/dashboard/kpi-card";
import OverviewChart from "@/components/dashboard/overview-chart";
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { CheckCircle, DollarSign, ListTodo, Settings, Loader2, Zap } from "lucide-react";
import RecentTasksCard from "@/components/dashboard/recent-tasks-card";
import { Button } from "@/components/ui/button";
import DashboardManagerModal from "@/components/dashboard/dashboard-manager-modal";

import { useUsers } from "@/hooks/use-users";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
import { isAfter } from "date-fns";
import type { Task, Project } from "@/lib/types";

// View for a single selected project (used by Manager and Member)
const ProjectSpecificView = ({ projectId }: { projectId: string }) => {
    const { tasks: allTasks, loading: tasksLoading } = useTasks();
    const { projects, loading: projectsLoading } = useProjects();
    const { preferences } = useDashboardPreferences();

    const { project, kpis, recentTasks, overviewTasks } = useMemo(() => {
        const currentProject = projects.find(p => p.id === projectId);
        
        // Guard clause: If the project isn't found, return a default state.
        if (!currentProject) {
            return { project: null, kpis: {}, recentTasks: [], overviewTasks: [] };
        }

        const projectTasks = allTasks.filter(t => t.project_id === projectId);
        const completedTasks = projectTasks.filter(t => t.status_id?.toLowerCase() === 'feito');
        const tasksAtRisk = projectTasks.filter(t => t.status_id?.toLowerCase() !== 'feito' && isAfter(new Date(), new Date(t.end_date)));

        const totalProgress = projectTasks.length > 0 ? projectTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / projectTasks.length : 0;

        const kpisData = {
            budget: `R$ ${(currentProject.spent || 0).toLocaleString('pt-BR')} / R$ ${(currentProject.budget || 0).toLocaleString('pt-BR')}`,
            tasks: `${completedTasks.length} / ${projectTasks.length}`,
            completion: `${Math.round(totalProgress)}%`,
            risk: `${tasksAtRisk.length}`,
        };

        const sortedTasks = [...projectTasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
            project: currentProject,
            kpis: kpisData,
            recentTasks: sortedTasks.slice(0, 5),
            overviewTasks: projectTasks
        };
    }, [projectId, projects, allTasks]);

    if (tasksLoading || projectsLoading || !project) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {preferences.kpiBudget && <KpiCard title="Orçamento Utilizado" value={kpis.budget || ''} icon={<DollarSign />} change="" />}
                {preferences.kpiCompletedTasks && <KpiCard title="Tarefas Concluídas" value={kpis.tasks || ''} icon={<ListTodo />} change="" />}
                {preferences.kpiCompletion && <KpiCard title="Progresso Geral" value={kpis.completion || ''} icon={<CheckCircle />} change="" />}
                {preferences.kpiRisk && <KpiCard title="Tarefas em Risco" value={kpis.risk || ''} icon={<Zap />} change="" valueClassName={parseInt(kpis.risk || '0', 10) > 0 ? "text-destructive" : ""} />}
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {preferences.chartOverview && <OverviewChart tasks={overviewTasks} />}
                {preferences.cardRecentTasks && <RecentTasksCard tasks={recentTasks} />}
            </div>
        </div>
    );
};


// Main view for the Manager, which can be consolidated or project-specific
const ManagerDashboardView = () => {
    const [selectedProject, setSelectedProject] = useState("consolidated");
    const { projects, loading: projectsLoading } = useProjects();
    const { tasks, loading: tasksLoading } = useTasks(); // Tasks for all managed projects
    const { preferences } = useDashboardPreferences();
    
    const consolidatedData = useMemo(() => {
        const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
        const tasksAtRisk = tasks.filter(t => t.status_id?.toLowerCase() !== 'feito' && isAfter(new Date(), new Date(t.end_date))).length;
        const totalProgress = projects.length > 0 ? (projects.reduce((sum, p) => {
            const projectTasks = tasks.filter(t => t.project_id === p.id);
            const projectProgress = projectTasks.length > 0 ? projectTasks.reduce((s, t) => s + (t.progress || 0), 0) / projectTasks.length : 0;
            return sum + projectProgress;
        }, 0) / projects.length) : 0;
        
        const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
        
        return {
            kpis: {
                total_budget: totalBudget,
                total_projects: projects.length,
                overall_progress: totalProgress,
                tasks_at_risk: tasksAtRisk,
            },
            recentTasks: recentTasks,
        }
    }, [projects, tasks]);


    if (projectsLoading || tasksLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const ConsolidatedView = () => {
        const { kpis, recentTasks } = consolidatedData;

        return (
            <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {preferences.kpiBudget && <KpiCard title="Orçamento Total" value={`R$ ${kpis.total_budget.toLocaleString('pt-BR')}`} icon={<DollarSign />} change="" />}
                    {preferences.kpiCompletedTasks && <KpiCard title="Projetos Ativos" value={String(kpis.total_projects)} icon={<ListTodo />} change="" />}
                    {preferences.kpiCompletion && <KpiCard title="Progresso Geral" value={`${Math.round(kpis.overall_progress)}%`} icon={<CheckCircle />} change="" />}
                    {preferences.kpiRisk && <KpiCard title="Tarefas em Risco" value={String(kpis.tasks_at_risk)} icon={<Zap />} change="" valueClassName={kpis.tasks_at_risk > 0 ? "text-destructive" : ""} />}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   {preferences.chartOverview && <OverviewChart tasks={tasks} />}
                   {preferences.cardRecentTasks && <RecentTasksCard tasks={recentTasks} />}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <ProjectSelector 
                projects={projects}
                value={selectedProject} 
                onValueChange={setSelectedProject} 
            />
            {selectedProject === 'consolidated' ? <ConsolidatedView /> : <ProjectSpecificView projectId={selectedProject} />}
        </div>
    );
};


// Main view for the Member, always project-specific
const MemberDashboardView = () => {
    const { projects, loading: projectsLoading } = useProjects();
    const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects, selectedProject]);

    if (projectsLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (projects.length === 0) {
        return <div className="text-center text-muted-foreground p-8">Você ainda não foi adicionado a nenhum projeto.</div>
    }

    return (
        <div className="flex flex-col gap-4">
            <ProjectSelector 
                projects={projects.filter(p => p.id !== 'consolidated')} // Ensure consolidated is not an option
                value={selectedProject || ''} 
                onValueChange={setSelectedProject} 
            />
            {selectedProject ? <ProjectSpecificView projectId={selectedProject} /> : <div className="flex items-center justify-center h-64 text-muted-foreground">Selecione um projeto para ver os detalhes.</div>}
        </div>
    );
};


const DashboardPageContent = () => {
  const { user, loading: userLoading } = useUsers();
  const { loading: preferencesLoading, preferences, setPreference, savePreferences } = useDashboardPreferences();
  const { setSelectedProjectId } = useTasks();
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Espera tanto o usuário quanto as preferências carregarem
  if (userLoading || preferencesLoading || !user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  const handleProjectSelectionForTasks = (projectId: string) => {
    setSelectedProjectId(projectId === 'consolidated' ? null : projectId);
  };
  
  const handlePreferencesSave = () => {
    savePreferences();
    setIsManagerOpen(false);
  };
  
  const isManager = user.role === 'Gerente' || user.role === 'Admin';

  return (
    <>
      <div className="flex flex-col gap-4">
          <PageHeader 
            title="Painel"
            description={isManager ? "Visão consolidada dos seus projetos." : "Selecione um projeto para ver os detalhes."}
            actions={
                isManager ? (
                    <Button variant="outline" size="icon" onClick={() => setIsManagerOpen(true)}>
                        <Settings className="h-5 w-5" />
                    </Button>
                ) : null
            }
          />
          {isManager ? <ManagerDashboardView /> : <MemberDashboardView />}
      </div>

       {isManager && <DashboardManagerModal
            isOpen={isManagerOpen}
            onOpenChange={setIsManagerOpen}
            preferences={preferences}
            setPreference={setPreference}
            onSave={handlePreferencesSave}
        />}
    </>
  );
}

export default function DashboardWrapper() {
    return <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}><DashboardPageContent /></Suspense>
}
