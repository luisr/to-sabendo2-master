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
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'wbs_code'>) => Promise<Task | null>;
  updateTask: (task: Partial<Task> & { id: string }) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

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
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(id, name),
        task_statuses(id, name, color),
        task_tags(tags(id, name))
      `);

    if (projectId !== 'consolidated') {
        query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error("Error fetching tasks:", error.message);
        toast({ title: "Erro ao buscar tarefas", description: error.message, variant: 'destructive'});
        setTasks([]);
    } else {
        const formattedTasks = data?.map((item : any) => ({
            ...item,
            status_id: item.task_statuses?.id || null,
            status_name: item.task_statuses?.name || 'N/A',
            status_color: item.task_statuses?.color || '#808080',
            assignee_id: item.assignee?.id || null,
            assignee_name: item.assignee?.name || 'N/A',
            tags: (item.task_tags || []).map((t: any) => t.tags) // CORREÇÃO AQUI
        })) || [];
        setTasks(formattedTasks);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTasks(selectedProjectId);
  }, [selectedProjectId, fetchTasks]);
  
  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'wbs_code'>): Promise<Task | null> => {
    // ...
    return null;
  }
  
  const updateTask = async (task: Partial<Task> & { id: string }): Promise<boolean> => {
    // ...
     return false;
  }
  
  const deleteTask = async (taskId: string): Promise<boolean> => {
    // ...
      return false;
  }

  const contextValue = { tasks, loading, selectedProjectId, setSelectedProjectId, addTask, updateTask, deleteTask };

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
