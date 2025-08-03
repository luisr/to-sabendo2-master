"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTableSettings, TaskStatus, CustomColumn, Tag } from "@/hooks/use-table-settings";
import { Trash2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/use-projects";
import { Checkbox } from "@/components/ui/checkbox";

interface TableManagerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TableManagerModal({ isOpen, onOpenChange }: TableManagerModalProps) {
  const { 
    statuses, customColumns, tags, addStatus, updateStatus, deleteStatus, 
    addCustomColumn, deleteCustomColumn, addTag, updateTag, deleteTag, 
    visibleColumns, setVisibleColumns, loading 
  } = useTableSettings();
  const { projects, selectedProject } = useProjects();
  const { toast } = useToast();

  const [localStatuses, setLocalStatuses] = useState<TaskStatus[]>([]);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<'texto' | 'numero' | 'data' | 'formula'>('texto');
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLocalStatuses(JSON.parse(JSON.stringify(statuses)));
      setLocalTags(JSON.parse(JSON.stringify(tags)));
    }
  }, [isOpen, statuses, tags]);
  
  const projectCustomColumns = customColumns.filter(c => c.project_id === selectedProject?.id);

  // ... (funções de manipulação para status, colunas, e tags)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Tabela</DialogTitle>
          <DialogDescription>Gerencie status, colunas customizadas, etiquetas e visibilidade.</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="columns" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="columns">Colunas e Visibilidade</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="tags">Etiquetas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Gerenciamento de Colunas e Visibilidade */}
          </TabsContent>

          <TabsContent value="status" className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Gerenciamento de Status */}
          </TabsContent>
          
          <TabsContent value="tags" className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Gerenciamento de Etiquetas */}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {/* Botões de salvar podem ser específicos por aba se necessário */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
