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
    setLoading(true);
    // Buscar o WBS Code mais alto para o projeto e calcular o próximo
    // Esta lógica pode precisar ser implementada em uma edge function ou função de banco de dados para evitar concorrência.
    // Por enquanto, vamos inserir a tarefa e o WBS code pode ser gerado no banco de dados via trigger/function se configurado.

    const { data, error } = await supabase.from('tasks').insert(taskData).select().single();

    if (error) {
        toast({ title: "Erro ao adicionar tarefa", description: error.message, variant: 'destructive' });
        setLoading(false);
        return null;
    } else if (data) {
        toast({ title: "Tarefa adicionada!", variant: 'success' });
        // Refetch as tarefas para incluir a nova e recalcular WBS Codes, se necessário
        fetchTasks(selectedProjectId);
        return formatTaskData(data); // Formatar os dados retornados
    }
    setLoading(false);
    return null;
  };

  const updateTask = async (taskId: string, taskData: Partial<Task>): Promise<boolean> => {
    setLoading(true);
    // Remover campos que não devem ser atualizados diretamente, como wbs_code ou fields related to joins
    const updatePayload: Partial<Task> = { ...taskData };
    // Exemplos de campos a remover, ajuste conforme a estrutura exata do seu banco/tipos
    delete (updatePayload as any).project_name;
    delete (updatePayload as any).status_name;
    delete (updatePayload as any).status_color;
    delete (updatePayload as any).assignee_name;
    delete (updatePayload as any).tags;
    // Se wbs_code não deve ser atualizável via este hook:
    delete (updatePayload as any).wbs_code;


    const { error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);

    if (error) {
        toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: 'destructive' });
        setLoading(false);
        return false;
    } else {
        toast({ title: "Tarefa atualizada!", variant: 'success' });
        // Refetch as tarefas para refletir a mudança
        fetchTasks(selectedProjectId);
        return true;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    setLoading(true);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
        toast({ title: "Erro ao excluir tarefa", description: error.message, variant: 'destructive' });
        setLoading(false);
        return false;
    } else {
        toast({ title: "Tarefa excluída!", variant: 'success' });
        // Refetch as tarefas para remover a tarefa excluída
        fetchTasks(selectedProjectId);
        return true;
    }
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