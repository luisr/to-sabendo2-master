
"use client";

import { useState, useEffect, Suspense } from "react";
import GanttChart from "@/components/projects/gantt-chart";
import PageHeader from "@/components/shared/page-header";
import ProjectSelector from "@/components/shared/project-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KanbanBoard from "@/components/projects/kanban-board";
import TableView from "@/components/projects/table-view";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Loader2 } from "lucide-react";

const MemberProjectsPageContent = () => {
  const [selectedProject, setSelectedProject] = useState("consolidated");
  const [activeTab, setActiveTab] = useState("table");
  const { projects, loading: projectsLoading } = useProjects();
  const { setSelectedProjectId } = useTasks();

  useEffect(() => {
    if (selectedProject && selectedProject !== 'consolidated') {
      setSelectedProjectId(selectedProject);
    } else {
      setSelectedProjectId(null);
    }
  }, [selectedProject, setSelectedProjectId]);

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader
        title="Meus Projetos"
        actions={
          <div className="flex items-center gap-2">
            <ProjectSelector 
              projects={projects} 
              value={selectedProject} 
              onValueChange={setSelectedProject} 
            />
          </div>
        }
      />
       <div className="h-full flex-1 print-container">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
            <TabsList className="grid grid-cols-3 no-print">
              <TabsTrigger value="table">Tabela</TabsTrigger>
              <TabsTrigger value="gantt">Gráfico de Gantt</TabsTrigger>
              <TabsTrigger value="board">Quadro Kanban</TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="flex-1">
             <TableView selectedProject={selectedProject} userRole="member"/>
            </TabsContent>
            <TabsContent value="gantt" className="flex-1">
             <GanttChart selectedProject={selectedProject} userRole="member"/>
            </TabsContent>
            <TabsContent value="board" className="flex-1">
            <KanbanBoard selectedProject={selectedProject} userRole="member"/>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function MemberProjectsPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <MemberProjectsPageContent />
        </Suspense>
    )
}
