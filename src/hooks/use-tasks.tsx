"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Task } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  addTask: (taskData: Omit<Task, 'id' | 'created_at' | 'wbs_code'>) => Promise<Task | null>;
  updateTask: (taskId: string, taskData: Partial<Task>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  fetchTasks: (projectId: string | null) => void;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

const formatTaskData = (item: any): Task => {
    // This function handles both flat and nested data structures
    return {
        ...item,
        project_name: item.projects?.name || 'N/A', // **Adicionado**
        status_id: item.task_statuses?.id || item.status_id,
        status_name: item.task_statuses?.name || item.status_name || 'N/A',
        status_color: item.task_statuses?.color || item.status_color || '#808080',
        assignee_id: item.assignee?.id || item.assignee_id,
        assignee_name: item.assignee?.name || item.assignee_name || 'N/A',
        tags: (item.task_tags || []).map((t: any) => t.tags).filter(Boolean),
    };
};

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async (projectId: string | null) => {
    if (!projectId) {
        setTasks([]);
        setLoading(false);
        return;
    }
    setLoading(true);

    const baseQuery = `
        *,
        projects (name),
        assignee:users(id, name),
        task_statuses(id, name, color),
        task_tags(tags(id, name))
    `;

    let query;
    if (projectId === 'consolidated') {
        const { data: projects, error: projectsError } = await supabase.from('projects').select('id');
        if (projectsError) {
            toast({ title: "Erro ao buscar projetos", description: projectsError.message, variant: 'destructive'});
            setTasks([]); setLoading(false); return;
        }
        const projectIds = projects.map(p => p.id);
        query = supabase.from('tasks').select(baseQuery).in('project_id', projectIds);
    } else {
        query = supabase.from('tasks').select(baseQuery).eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
        toast({ title: "Erro ao buscar tarefas", description: error.message, variant: 'destructive'});
        setTasks([]);
    } else {
        setTasks(data?.map(formatTaskData) || []);
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTasks(selectedProjectId);
  }, [selectedProjectId, fetchTasks]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'wbs_code'>): Promise<Task | null> => {
    // ... (lógica existente)
    return null;
  };

  const updateTask = async (taskId: string, taskData: Partial<Task>): Promise<boolean> => {
    // ... (lógica existente)
    return false;
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    // ... (lógica existente)
    return false;
  };

  const contextValue = { tasks, loading, selectedProjectId, setSelectedProjectId, addTask, updateTask, deleteTask, fetchTasks };

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
};
