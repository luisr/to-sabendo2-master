
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { useUsers } from './use-users';

// Define os widgets padrão e seus estados de visibilidade iniciais
const defaultPreferences = {
  kpiBudget: true,
  kpiCompletedTasks: true,
  kpiRisk: true,
  kpiCompletion: true,
  chartOverview: true,
  cardRecentProjects: true,
  cardRecentTasks: true,
};

type Preferences = typeof defaultPreferences;

interface DashboardPreferencesContextType {
  preferences: Preferences;
  loading: boolean;
  setPreference: (widgetId: keyof Preferences, isVisible: boolean) => void;
  savePreferences: () => void;
}

const DashboardPreferencesContext = createContext<DashboardPreferencesContextType | undefined>(undefined);

export const DashboardPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const { user } = useUsers();
  const { toast } = useToast();

  // Busca as preferências salvas quando o usuário é carregado
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('user_dashboard_preferences')
        .select('widget_id, is_visible')
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error fetching preferences:", error);
      } else if (data && data.length > 0) {
        const loadedPreferences = data.reduce((acc, pref) => {
          acc[pref.widget_id as keyof Preferences] = pref.is_visible;
          return acc;
        }, {} as Preferences);
        setPreferences(prev => ({ ...prev, ...loadedPreferences }));
      }
      setLoading(false);
    };
    fetchPreferences();
  }, [user]);

  // Atualiza o estado de uma preferência específica
  const setPreference = (widgetId: keyof Preferences, isVisible: boolean) => {
    setPreferences(prev => ({ ...prev, [widgetId]: isVisible }));
  };

  // Salva o conjunto atual de preferências no banco de dados
  const savePreferences = async () => {
    if (!user) return;

    const preferencesToSave = Object.entries(preferences).map(([widget_id, is_visible]) => ({
      widget_id,
      is_visible,
    }));

    const { error } = await supabase.rpc('upsert_dashboard_preferences', { preferences: preferencesToSave });
    
    if (error) {
      toast({ title: "Erro ao salvar preferências", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preferências salvas com sucesso!" });
    }
  };

  return (
    <DashboardPreferencesContext.Provider value={{ preferences, loading, setPreference, savePreferences }}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
};

export const useDashboardPreferences = () => {
  const context = useContext(DashboardPreferencesContext);
  if (context === undefined) {
    throw new Error('useDashboardPreferences must be used within a DashboardPreferencesProvider');
  }
  return context;
};
