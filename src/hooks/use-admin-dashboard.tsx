
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { Project, Task } from '@/lib/types';

interface AdminDashboardData {
  kpis: {
    total_projects: number;
    total_budget: number;
    overall_progress: number;
    total_tasks: number;
    completed_tasks: number;
    tasks_at_risk: number;
  };
  recentProjects: Project[];
  recentTasks: Task[];
  tasksByStatus: { status_name: string; count: number }[];
}

export const useAdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Attempting to fetch admin dashboard data...");

      // Chamar todas as funções RPC em paralelo para otimizar o carregamento
      const [kpisRes, recentProjectsRes, recentTasksRes, tasksByStatusRes] = await Promise.all([
        supabase.rpc('get_manager_kpis'),
        supabase.rpc('get_manager_recent_projects'),
        supabase.rpc('get_manager_recent_tasks'),
        supabase.rpc('get_manager_tasks_by_status')
      ]);

      // Verificar erros em cada resposta
      console.log("kpisRes: ", kpisRes);
      if (kpisRes.error) throw kpisRes.error;
      
      console.log("recentProjectsRes: ", recentProjectsRes);
      if (recentProjectsRes.error) throw recentProjectsRes.error;
      
      console.log("recentTasksRes: ", recentTasksRes);
      if (recentTasksRes.error) throw recentTasksRes.error;
      
      console.log("tasksByStatusRes: ", tasksByStatusRes);
      if (tasksByStatusRes.error) throw tasksByStatusRes.error;
      
      const kpisData = kpisRes.data?.[0];

      if (!kpisData) {
        throw new Error("A função de agregação de KPIs não retornou dados válidos.");
      }

      setData({
        kpis: kpisData,
        recentProjects: recentProjectsRes.data,
        recentTasks: recentTasksRes.data,
        tasksByStatus: tasksByStatusRes.data,
      });
      console.log("Admin dashboard data fetched successfully.");

    } catch (error: any) {
      console.error("Error fetching admin dashboard data:", error);
      toast({
        title: "Erro ao carregar dados do dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, refetch: fetchDashboardData };
};
