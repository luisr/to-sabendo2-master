
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
      
      // Chamar a nova função RPC consolidada
      const { data: dashboardData, error } = await supabase.rpc('get_manager_dashboard_data');

      if (error) throw error;

      // O resultado já é o objeto consolidado
      const { kpis: kpisData, recentProjects: recentProjectsRes, recentTasks: recentTasksRes, tasksByStatus: tasksByStatusRes } = dashboardData;

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
