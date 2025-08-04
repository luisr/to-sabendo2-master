"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Project } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  refetchProjects: () => void;
  addProject: (project: Omit<Project, 'id' | 'created_at'>) => Promise<void>;
  updateProject: (id: string, updates: Omit<Project, 'id' | 'created_at'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
      toast({ title: "Erro ao carregar projetos", description: error.message, variant: "destructive" });
    } else {
      setProjects(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('projects').insert(project);
    if (error) {
      toast({ title: "Erro ao adicionar projeto", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Projeto adicionado com sucesso!" });
      fetchProjects();
    }
  };

  const updateProject = async (id: string, updates: Omit<Project, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) {
      toast({ title: "Erro ao atualizar projeto", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Projeto atualizado com sucesso!" });
      fetchProjects();
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro ao excluir projeto", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Projeto excluído com sucesso!" });
      fetchProjects();
    }
  };

  return (
    <ProjectsContext.Provider value={{ projects, loading, refetchProjects: fetchProjects, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
};
