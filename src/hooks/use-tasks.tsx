"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import type { Task } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Função para aninhar tarefas
const nestTasks = (tasks: Task[]): (Task & { subtasks: any[] })[] => {
    if (!tasks || tasks.length === 0) return [];
    const taskMap: { [key: string]: Task & { subtasks: any[] } } = {};
    tasks.forEach(task => {
        taskMap[task.id] = { ...task, subtasks: [] };
    });
    const nestedTasks: (Task & { subtasks: any[] })[] = [];
    tasks.forEach(task => {
        if (task.parent_id && taskMap[task.parent_id]) {
            taskMap[task.parent_id].subtasks.push(taskMap[task.id]);
        } else {
            nestedTasks.push(taskMap[task.id]);
        }
    });
    return nestedTasks;
};

// Tipos do Contexto
interface TasksContextType {
  tasks: (Task & { subtasks: any[] })[];
  rawTasks: Task[];
  loading: boolean;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  refetchTasks: () => void;
  addTask: (taskData: Partial<Task> & { tag_ids?: string[] }) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  setParentTask: (taskIds: string[], parentId: string | null) => Promise<boolean>;
  updateTaskStatus: (taskId: string, newStatusId: string) => Promise<void>;
  updateTask: (taskId: string, updatedData: Partial<Task> & { tag_ids?: string[] }) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
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
  
  const tasks = useMemo(() => nestTasks(rawTasks), [rawTasks]);

  const addTask = async (taskData: Partial<Task> & { tag_ids?: string[] }): Promise<boolean> => {
    const { tag_ids, ...rest } = taskData;
    const customFields = rest.custom_fields || {};
    const { error } = await supabase.rpc('insert_task_with_tags', {
      p_project_id: rest.project_id, p_name: rest.name, p_description: rest.description,
      p_assignee_id: rest.assignee_id, p_status_id: rest.status_id, p_priority: rest.priority,
      p_progress: rest.progress, p_start_date: rest.start_date, p_end_date: rest.end_date,
      p_parent_id: rest.parent_id, p_dependencies: rest.dependencies, p_tag_ids: tag_ids, 
      p_custom_fields: customFields
    });
    if (error) { toast({ title: "Erro ao adicionar tarefa", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Tarefa adicionada com sucesso!" });
    await fetchTasks();
    return true;
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    const originalTasks = [...rawTasks];
    setRawTasks(prev => prev.filter(t => t.id !== taskId));
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { 
      toast({ title: "Erro ao excluir tarefa", description: error.message, variant: "destructive" });
      setRawTasks(originalTasks);
      return false;
    }
    toast({ title: "Tarefa excluída com sucesso!" });
    return true;
  };

  const setParentTask = async (taskIds: string[], parentId: string | null): Promise<boolean> => {
    const originalTasks = [...rawTasks];
    const updatedTasks = rawTasks.map(t => taskIds.includes(t.id) ? { ...t, parent_id: parentId } : t);
    setRawTasks(updatedTasks);
    
    const { error } = await supabase.from('tasks').update({ parent_id: parentId }).in('id', taskIds);
    if (error) {
       toast({ title: "Erro ao definir tarefa pai", description: error.message, variant: "destructive" });
       setRawTasks(originalTasks);
       return false;
    }
    toast({ title: "Hierarquia atualizada!" });
    return true;
  };

  const updateTaskStatus = async (taskId: string, newStatusId: string): Promise<void> => {
    const originalTasks = [...rawTasks];
    const updatedTasks = rawTasks.map(t => t.id === taskId ? { ...t, status_id: newStatusId } : t);
    setRawTasks(updatedTasks);
    
    const { error } = await supabase.from('tasks').update({ status_id: newStatusId }).eq('id', taskId);

    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      setRawTasks(originalTasks);
    }
  };
  
  const updateTask = async (taskId: string, updatedData: Partial<Task> & { tag_ids?: string[] }): Promise<void> => {
      if (!updatedData) {
          toast({ title: "Erro de atualização", description: "Nenhum dado fornecido.", variant: "destructive" });
          return;
      }
      const originalTasks = [...rawTasks];
      setRawTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedData } : t));

      const { tag_ids, ...taskFields } = updatedData;
      
      const { error } = await supabase.rpc('update_task_with_tags', {
          p_task_id: taskId,
          p_name: taskFields.name,
          p_description: taskFields.description,
          p_assignee_id: taskFields.assignee_id,
          p_status_id: taskFields.status_id,
          p_priority: taskFields.priority,
          p_progress: taskFields.progress,
          p_start_date: taskFields.start_date,
          p_end_date: taskFields.end_date,
          p_parent_id: taskFields.parent_id,
          p_dependencies: taskFields.dependencies,
          p_custom_fields: taskFields.custom_fields || {},
          p_tag_ids: tag_ids || []
      });

      if (error) {
          toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
          setRawTasks(originalTasks);
      } else {
          toast({ title: "Tarefa atualizada com sucesso!" });
      }
  };

  const contextValue = {
    tasks, rawTasks, loading, selectedProjectId, setSelectedProjectId,
    refetchTasks: fetchTasks, addTask, deleteTask, setParentTask, updateTaskStatus, updateTask
  };

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) throw new Error("useTasks must be used within a TasksProvider");
  return context;
};
