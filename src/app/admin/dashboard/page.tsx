
"use client";

import { useState, Suspense, useEffect } from "react";
import KpiCard from "@/components/dashboard/kpi-card";
import OverviewChart from "@/components/dashboard/overview-chart";
import RecentProjectsCard from "@/components/dashboard/recent-projects-card";
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { CheckCircle, DollarSign, ListTodo, Zap, Settings, Loader2 } from "lucide-react";
import RecentTasksCard from "@/components/dashboard/recent-tasks-card";
import { Button } from "@/components/ui/button";
import DashboardManagerModal from "@/components/dashboard/dashboard-manager-modal";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences"; // Importar

// Componente para a visão consolidada do Admin
const ConsolidatedView = () => {
  const { data: adminData, loading: adminLoading } = useAdminDashboard();
  const { preferences } = useDashboardPreferences(); // Usar as preferências

  if (adminLoading || !adminData) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const { kpis, recentProjects, recentTasks, tasksByStatus } = adminData;

  return (
    <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {preferences.kpiBudget && <KpiCard title="Orçamento Total" value={`R$ ${kpis.total_budget.toLocaleString('pt-BR')}`} icon={<DollarSign />} change="" />}
            {preferences.kpiCompletedTasks && <KpiCard title="Projetos Ativos" value={String(kpis.total_projects)} icon={<ListTodo />} change="" />}
            {preferences.kpiCompletion && <KpiCard title="Progresso Geral" value={`${Math.round(kpis.overall_progress)}%`} icon={<CheckCircle />} change="" />}
            {preferences.kpiRisk && <KpiCard title="Tarefas em Risco" value={String(kpis.tasks_at_risk)} icon={<Zap />} change="" valueClassName="text-destructive" />}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {preferences.chartOverview && <OverviewChart data={tasksByStatus} />}
            {preferences.cardRecentProjects && <RecentProjectsCard projects={recentProjects} />}
        </div>
        {preferences.cardRecentTasks && <RecentTasksCard tasks={recentTasks} />}
    </div>
  );
};

// Componente para a visão de projeto único (quando o Admin seleciona um)
const ProjectSpecificView = ({ projectId }: { projectId: string }) => { 
    return <div className="flex items-center justify-center h-full">Visão do projeto {projectId}</div>;
};

const AdminDashboardPageContent = () => {
  const [selectedProject, setSelectedProject] = useState("consolidated");
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const { projects, loading: projectsLoading } = useProjects();
  const { setSelectedProjectId } = useTasks();
  const { preferences, setPreference, savePreferences } = useDashboardPreferences();

  useEffect(() => {
    setSelectedProjectId(selectedProject === 'consolidated' ? null : selectedProject);
  }, [selectedProject, setSelectedProjectId]);

  const handlePreferencesSave = () => {
    savePreferences();
    setIsManagerOpen(false);
  };
  
  if (projectsLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader 
          title="Painel do Gerente" 
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setIsManagerOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
              <ProjectSelector 
                projects={[{ id: 'consolidated', name: 'Visão Consolidada' }, ...projects]} 
                value={selectedProject} 
                onValueChange={setSelectedProject} 
              />
            </div>
          }
        />
        
        {selectedProject === 'consolidated' ? (
          <ConsolidatedView />
        ) : (
          <ProjectSpecificView projectId={selectedProject} />
        )}

      </div>
      <DashboardManagerModal
        isOpen={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        preferences={preferences}
        setPreference={setPreference}
        onSave={handlePreferencesSave}
      />
    </>
  );
}

export default function AdminDashboardWrapper() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <AdminDashboardPageContent />
        </Suspense>
    )
}
