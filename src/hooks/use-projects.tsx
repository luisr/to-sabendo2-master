"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Project, User } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "./use-users";

interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  addProject: (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const { user } = useUsers();

  const fetchProjects = useCallback(async (currentUser: User) => {
    console.log(`[fetchProjects] Iniciando busca de projetos para o usuário ${currentUser.email} com o papel: ${currentUser.role}`);
    setLoading(true);
    let response;

    if (currentUser.role === 'Admin') {
      console.log("[fetchProjects] Executando lógica de Admin...");
      response = await supabase.from('projects').select('*'); // Admins veem todos os projetos
    } else if (currentUser.role === 'Gerente') {
      console.log("[fetchProjects] Executando lógica de Gerente...");
      response = await supabase.rpc('get_managed_projects', { p_user_id: currentUser.id });
    } else { // Membro
      console.log("[fetchProjects] Executando lógica de Membro...");
      response = await supabase
        .from('projects')
        .select('*, collaborators!inner(user_id)')
        .eq('collaborators.user_id', currentUser.id);
    }

    const { data, error } = response;
    console.log("[fetchProjects] Resposta do Supabase:", { data, error });

    if (error) {
      toast({ title: "Erro ao buscar projetos", description: error.message, variant: 'destructive' });
      setProjects([]);
    } else {
      console.log("[fetchProjects] Projetos recebidos:", data);
      setProjects(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchProjects(user);
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [user, fetchProjects]);

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('projects').insert(projectData).select().single();
    if (error) {
        toast({ title: "Erro ao criar projeto", description: error.message, variant: 'destructive' });
        return null;
    }
    if (user) await fetchProjects(user);
    return data;
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
        toast({ title: "Erro ao excluir projeto", description: error.message, variant: 'destructive' });
        return false;
    }
    if (user) await fetchProjects(user);
    return true;
  };

  const contextValue = { projects, loading, addProject, deleteProject };

  return (
    <ProjectsContext.Provider value={contextValue}>
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
