"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';

/**
 * Hook dedicado para buscar tarefas de um projeto específico.
 * Ele gerencia seu próprio estado de loading, erro e dados,
 * evitando conflitos com o contexto global de tarefas.
 *
 * @param projectId O ID do projeto para o qual buscar as tarefas.
 * @returns Um objeto com as tarefas, o estado de carregamento e um erro (se houver).
 */
export const useProjectTasks = (projectId: string | null | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('get_tasks_for_project', {
      p_project_id: projectId,
    });

    if (rpcError) {
      console.error("Erro ao buscar tarefas do projeto:", rpcError);
      setError(new Error(rpcError.message));
      setTasks([]);
    } else {
      setTasks(data || []);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetchTasks: fetchTasks };
};
