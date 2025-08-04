"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import type { Task } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Função para aninhar as tarefas
const nestTasks = (tasks: Task[]): Task[] => {
    if (!tasks || tasks.length === 0) return [];

    const taskMap: { [key: string]: Task & { subtasks: Task[] } } = {};
    tasks.forEach(task => {
        taskMap[task.id] = { ...task, subtasks: [] };
    });

    const nestedTasks: Task[] = [];
    tasks.forEach(task => {
        if (task.parent_id && taskMap[task.parent_id]) {
            taskMap[task.parent_id].subtasks.push(taskMap[task.id]);
        } else {
            nestedTasks.push(taskMap[task.id]);
        }
    });

    return nestedTasks;
};


interface TasksContextType {
  tasks: Task[]; // Agora sempre aninhado
  loading: boolean;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  refetchTasks: () => void;
  addTask: (taskData: Partial<Task> & { tag_ids?: string[] }) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  setParentTask: (taskIds: string[], parentId: string) => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [rawTasks, setRawTasks] = useState<Task[]>([]); // Estado para a lista plana
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!selectedProjectId) {
      setRawTasks([]);
      setLoading(false);
      return;
    };
    
    setLoading(true);
    
    const rpcToCall = selectedProjectId === 'consolidated' ? 'get_all_user_tasks' : 'get_tasks_for_project';
    const params = selectedProjectId === 'consolidated' ? {} : { p_project_id: selectedProjectId };

    const { data, error } = await supabase.rpc(rpcToCall, params);

    if (error) {
      toast({ title: "Erro ao carregar tarefas", description: error.message, variant: "destructive" });
      setRawTasks([]);
    } else {
      setRawTasks(data || []);
    }
    setLoading(false);
  }, [selectedProjectId, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  // Usar useMemo para aninhar as tarefas apenas quando a lista plana mudar
  const tasks = useMemo(() => nestTasks(rawTasks), [rawTasks]);

  const addTask = async (taskData: Partial<Task> & { tag_ids?: string[] }): Promise<boolean> => {
    const { tag_ids, ...rest } = taskData;
    const { error } = await supabase.rpc('insert_task_with_tags', {
      p_project_id: rest.project_id,
      p_name: rest.name,
      p_description: rest.description,
      p_assignee_id: rest.assignee_id,
      p_status_id: rest.status_id,
      p_priority: rest.priority,
      p_progress: rest.progress,
      p_start_date: rest.start_date,
      p_end_date: rest.end_date,
      p_parent_id: rest.parent_id,
      p_dependencies: rest.dependencies,
      p_tag_ids: tag_ids,
    });
    
    if (error) {
      toast({ title: "Erro ao adicionar tarefa", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Tarefa adicionada com sucesso!" });
    fetchTasks();
    return true;
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
     if (error) {
      toast({ title: "Erro ao excluir tarefa", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Tarefa excluída com sucesso!" });
    fetchTasks();
    return true;
  };

  const setParentTask = async (taskIds: string[], parentId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tasks')
      .update({ parent_id: parentId })
      .in('id', taskIds);

    if (error) {
      toast({ title: "Erro ao definir tarefa pai", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Tarefa pai definida com sucesso!" });
    fetchTasks();
    return true;
  };

  const contextValue = {
    tasks, // Fornecer a lista aninhada
    loading,
    selectedProjectId,
    setSelectedProjectId,
    refetchTasks: fetchTasks,
    addTask,
    deleteTask,
    setParentTask,
  };

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
