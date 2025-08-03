"use client";
import { createContext, useContext, useState, type ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "./use-toast";

export interface TaskStatus { id: string; name: string; color: string; display_order: number; }
export interface CustomColumn { id: string; project_id: string; name: string; type: 'texto' | 'numero' | 'data' | 'formula'; display_order: number; created_at: string; }
export interface Tag { id: string; name: string; }

interface TableSettingsContextType {
  statuses: TaskStatus[];
  customColumns: CustomColumn[];
  tags: Tag[];
  loading: boolean;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  addStatus: (data: { name: string; color: string; }) => Promise<TaskStatus | null>;
  updateStatus: (id: string, data: Partial<TaskStatus>) => Promise<boolean>;
  deleteStatus: (id: string) => Promise<boolean>;
  addTag: (data: { name: string; }) => Promise<Tag | null>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
  addCustomColumn: (data: any) => Promise<void>;
  deleteCustomColumn: (id: string) => Promise<void>;
}

const TableSettingsContext = createContext<TableSettingsContextType | undefined>(undefined);

const initialVisibleColumns = ['project_name', 'assignee', 'status', 'priority', 'progress', 'start_date', 'end_date'];

export const TableSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statusRes, columnRes, tagRes] = await Promise.all([
      supabase.from('task_statuses').select('*').order('display_order'),
      supabase.from('custom_columns').select('*').order('display_order'),
      supabase.from('tags').select('*').order('name')
    ]);

    setStatuses(statusRes.data || []);
    setCustomColumns(columnRes.data || []);
    setTags(tagRes.data || []);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addStatus = async (data: { name: string; color: string; }): Promise<TaskStatus | null> => {
    const nextOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.display_order)) + 1 : 1;
    const { data: newStatus, error } = await supabase.from('task_statuses').insert({ ...data, display_order: nextOrder }).select().single();
    if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return null;
    }
    if (newStatus) setStatuses(prev => [...prev, newStatus]);
    return newStatus;
  };

  const updateStatus = async (id: string, data: Partial<TaskStatus>): Promise<boolean> => {
    const { error } = await supabase.from('task_statuses').update(data).eq('id', id);
    if (error) return false;
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    return true;
  };

  const deleteStatus = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('task_statuses').delete().eq('id', id);
    if (error) return false;
    setStatuses(prev => prev.filter(s => s.id !== id));
    return true;
  }

  const addTag = async (data: { name: string; }): Promise<Tag | null> => {
    const { data: newTag, error } = await supabase.from('tags').insert(data).select().single();
    if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return null;
    }
    if (newTag) setTags(prev => [...prev, newTag]);
    return newTag;
  };

  const updateTag = async (id: string, data: Partial<Tag>): Promise<boolean> => {
    const { error } = await supabase.from('tags').update(data).eq('id', id);
    if (error) return false;
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    return true;
  };

  const deleteTag = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) return false;
    setTags(prev => prev.filter(t => t.id !== id));
    return true;
  }
  
  const addCustomColumn = async (data: any) => { /* Lógica para adicionar coluna */ };
  const deleteCustomColumn = async (id: string) => { /* Lógica para deletar coluna */ };

  const contextValue = {
    statuses, customColumns, tags, loading, visibleColumns,
    setVisibleColumns, addStatus, updateStatus, deleteStatus,
    addTag, updateTag, deleteTag, addCustomColumn, deleteCustomColumn
  };

  return (
    <TableSettingsContext.Provider value={contextValue}>
      {children}
    </TableSettingsContext.Provider>
  );
};

export const useTableSettings = () => {
  const context = useContext(TableSettingsContext);
  if (context === undefined) {
    throw new Error("useTableSettings must be used within a TableSettingsProvider");
  }
  return context;
};
