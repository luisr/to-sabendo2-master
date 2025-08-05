"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface TaskStatus { id: string; name: string; color: string; display_order?: number; }
export interface Tag { id: string; name: string; }
export interface Column { id: string; name: string; type: 'text' | 'number' | 'date' | 'progress'; }

interface TableSettingsContextType {
  statuses: TaskStatus[];
  tags: Tag[];
  loading: boolean;
  addStatus: (status: Omit<TaskStatus, 'id'>) => Promise<TaskStatus | null>;
  updateStatus: (id: string, updates: Partial<TaskStatus>) => Promise<boolean>;
  deleteStatus: (id: string) => Promise<boolean>;
  addTag: (tag: Omit<Tag, 'id'>) => Promise<Tag | null>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  columns: Column[];
  addColumn: (columnName: string, columnType: Column['type']) => void;
  updateColumn: (columnId: string, newName: string, newType: Column['type']) => void;
  duplicateColumn: (columnId: string) => void;
  deleteColumn: (columnId: string) => void;
}

const TableSettingsContext = createContext<TableSettingsContextType | undefined>(undefined);

const initialColumns: Column[] = [
    { id: 'formatted_id', name: 'ID', type: 'text' },
    { id: 'project_name', name: 'Projeto', type: 'text' },
    { id: 'assignee', name: 'Responsável', type: 'text' },
    { id: 'status', name: 'Status', type: 'text' },
    { id: 'priority', name: 'Prioridade', type: 'text' },
    { id: 'tags', name: 'Tags', type: 'text' },
    { id: 'progress', name: 'Progresso', type: 'progress' },
    { id: 'start_date', name: 'Início', type: 'date' },
    { id: 'end_date', name: 'Fim', type: 'date' },
    { id: 'duration', name: 'Duração', type: 'number' },
];

export const TableSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialColumns.map(c => c.id));
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    console.log("[useTableSettings] Iniciando fetchData...");
    setLoading(true);
    try {
      const [statusRes, tagsRes] = await Promise.all([
        supabase.from('task_statuses').select('*').order('display_order'),
        supabase.from('tags').select('*')
      ]);
      console.log("[useTableSettings] Resposta de 'task_statuses':", statusRes);
      console.log("[useTableSettings] Resposta de 'tags':", tagsRes);
      if (statusRes.error) throw statusRes.error;
      if (tagsRes.error) throw tagsRes.error;
      setStatuses(statusRes.data || []);
      setTags(tagsRes.data || []);
      console.log(`[useTableSettings] Dados carregados: ${statusRes.data?.length} status, ${tagsRes.data?.length} tags.`);
    } catch (error: any) {
      console.error("[useTableSettings] Erro ao buscar configurações da tabela:", error);
      toast({ title: "Erro Crítico ao Carregar Configurações", description: `Falha na busca de status/tags: ${error.message}`, variant: "destructive", duration: 10000 });
    } finally {
      setLoading(false);
      console.log("[useTableSettings] fetchData finalizado.");
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addStatus = async (status: Omit<TaskStatus, 'id'>) => {
    const { data, error } = await supabase.from('task_statuses').insert(status).select();
    if (error) { toast({ title: "Erro ao adicionar status", description: error.message, variant: "destructive" }); return null; }
    const newStatus = data[0];
    setStatuses(prev => [...prev, newStatus]);
    return newStatus;
  };
  const updateStatus = async (id: string, updates: Partial<TaskStatus>) => {
      const { error } = await supabase.from('task_statuses').update(updates).eq('id', id);
      if(error) { toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" }); return false; }
      setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return true;
  };
  const deleteStatus = async (id: string) => {
      const { error } = await supabase.from('task_statuses').delete().eq('id', id);
      if(error) { toast({ title: "Erro ao excluir status", description: error.message, variant: "destructive" }); return false; }
      setStatuses(prev => prev.filter(s => s.id !== id));
      return true;
  };
  const addTag = async (tag: Omit<Tag, 'id'>) => {
    const { data, error } = await supabase.from('tags').insert(tag).select();
    if (error) { toast({ title: "Erro ao adicionar etiqueta", description: error.message, variant: "destructive" }); return null; }
    const newTag = data[0];
    setTags(prev => [...prev, newTag]);
    return newTag;
  };
  const updateTag = async (id: string, updates: Partial<Tag>) => {
      const { error } = await supabase.from('tags').update(updates).eq('id', id);
      if(error) { toast({ title: "Erro ao atualizar etiqueta", description: error.message, variant: "destructive" }); return false; }
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return true;
  };
  const deleteTag = async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if(error) { toast({ title: "Erro ao excluir etiqueta", description: error.message, variant: "destructive" }); return false; }
      setTags(prev => prev.filter(t => t.id !== id));
      return true;
  };
  const addColumn = (columnName: string, columnType: Column['type']) => {
    const newColumn = { id: `custom_${Date.now()}`, name: columnName, type: columnType, };
    setColumns(prev => [...prev, newColumn]);
    setVisibleColumns(prev => [...prev, newColumn.id]);
  };
  const updateColumn = (columnId: string, newName: string, newType: Column['type']) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, name: newName, type: newType } : c));
  };
  const duplicateColumn = (columnId: string) => {
    const columnToDuplicate = columns.find(c => c.id === columnId);
    if (columnToDuplicate) {
        const newColumn = { id: `${columnToDuplicate.id}_${Date.now()}`, name: `${columnToDuplicate.name} (Cópia)`, type: columnToDuplicate.type, };
        setColumns(prev => [...prev, newColumn]);
        setVisibleColumns(prev => [...prev, newColumn.id]);
    }
  };
  const deleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(c => c.id !== columnId));
    setVisibleColumns(prev => prev.filter(id => id !== columnId));
  };

  return (
    <TableSettingsContext.Provider value={{ 
      statuses, tags, loading, addStatus, updateStatus, deleteStatus,
      addTag, updateTag, deleteTag,
      visibleColumns, setVisibleColumns,
      columns, addColumn, updateColumn, duplicateColumn, deleteColumn
    }}>
      {children}
    </TableSettingsContext.Provider>
  );
};

export const useTableSettings = () => {
  const context = useContext(TableSettingsContext);
  if (context === undefined) throw new Error('useTableSettings must be used within a TableSettingsProvider');
  return context;
};
