"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTableSettings, TaskStatus, Tag } from "@/hooks/use-table-settings";
import { Trash2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface TableManagerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_COLUMNS = [
    { id: 'project_name', name: 'Projeto' }, // **Adicionado**
    { id: 'assignee', name: 'Responsável' },
    { id: 'status', name: 'Status' },
    { id: 'priority', name: 'Prioridade' },
    { id: 'tags', name: 'Tags' },
    { id: 'progress', name: 'Progresso' },
    { id: 'start_date', name: 'Início' },
    { id: 'end_date', name: 'Fim' },
];

export default function TableManagerModal({ isOpen, onOpenChange }: TableManagerModalProps) {
  const { 
    statuses, tags, addStatus, updateStatus, deleteStatus, 
    addTag, updateTag, deleteTag, 
    visibleColumns, setVisibleColumns 
  } = useTableSettings();
  const { toast } = useToast();

  const [localStatuses, setLocalStatuses] = useState<TaskStatus[]>([]);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#808080");
  const [newTagName, setNewTagName] = useState("");
  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalStatuses(JSON.parse(JSON.stringify(statuses)));
      setLocalTags(JSON.parse(JSON.stringify(tags)));
      setLocalVisibleColumns([...visibleColumns]);
    }
  }, [isOpen, statuses, tags, visibleColumns]);

  const handleStatusChange = (id: string, name: string, color: string) => {
    setLocalStatuses(localStatuses.map(s => s.id === id ? { ...s, name, color } : s));
  };
  
  const handleTagChange = (id: string, name: string) => {
      setLocalTags(localTags.map(t => t.id === id ? {...t, name} : t));
  }

  const handleSaveSettings = async () => {
    try {
        await Promise.all([
            ...localStatuses.map(s => updateStatus(s.id, { name: s.name, color: s.color })),
            ...localTags.map(t => updateTag(t.id, { name: t.name })),
        ]);
        setVisibleColumns(localVisibleColumns);
        toast({ title: "Sucesso", description: "Configurações da tabela salvas." });
        onOpenChange(false);
    } catch (error) {
        toast({ title: "Erro", description: "Não foi possível salvar as configurações.", variant: "destructive" });
    }
  };
  
  const handleAddStatus = async () => {
    if (!newStatusName.trim()) return;
    const newStatus = await addStatus({ name: newStatusName, color: newStatusColor });
    if (newStatus) {
        setLocalStatuses([...localStatuses, newStatus]);
        setNewStatusName("");
        setNewStatusColor("#808080");
        toast({ title: "Status adicionado com sucesso!"});
    }
  }

  const handleAddTag = async () => {
      if(!newTagName.trim()) return;
      const newTag = await addTag({ name: newTagName });
      if(newTag) {
          setLocalTags([...localTags, newTag]);
          setNewTagName("");
          toast({ title: "Etiqueta adicionada com sucesso!"});
      }
  }
  
  const handleColumnVisibilityChange = (columnId: string, checked: boolean) => {
    setLocalVisibleColumns(prev => 
        checked ? [...prev, columnId] : prev.filter(id => id !== columnId)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Tabela</DialogTitle>
          <DialogDescription>Personalize status, etiquetas e a visibilidade das colunas da sua tabela.</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="columns" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="columns">Colunas</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="tags">Etiquetas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <h4 className="font-semibold">Visibilidade das Colunas</h4>
            <div className="grid grid-cols-2 gap-4">
                {DEFAULT_COLUMNS.map(col => (
                    <div key={col.id} className="flex items-center space-x-2">
                        <Checkbox 
                            id={col.id} 
                            checked={localVisibleColumns.includes(col.id)}
                            onCheckedChange={(checked) => handleColumnVisibilityChange(col.id, !!checked)}
                        />
                        <Label htmlFor={col.id}>{col.name}</Label>
                    </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="status" className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <h4 className="font-semibold">Gerenciar Status</h4>
            {localStatuses.map(status => (
                <div key={status.id} className="flex items-center gap-2">
                    <Input type="color" value={status.color} onChange={(e) => handleStatusChange(status.id, status.name, e.target.value)} className="w-14 p-1"/>
                    <Input value={status.name} onChange={(e) => handleStatusChange(status.id, e.target.value, status.color)} />
                    <Button variant="ghost" size="icon" onClick={() => deleteStatus(status.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
            ))}
            <div className="flex items-center gap-2 pt-4 border-t">
                <Input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-14 p-1"/>
                <Input placeholder="Novo status..." value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} />
                <Button onClick={handleAddStatus}><PlusCircle className="h-4 w-4 mr-2"/>Adicionar</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="tags" className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
             <h4 className="font-semibold">Gerenciar Etiquetas</h4>
             {localTags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2">
                    <Input value={tag.name} onChange={(e) => handleTagChange(tag.id, e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => deleteTag(tag.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
             ))}
             <div className="flex items-center gap-2 pt-4 border-t">
                <Input placeholder="Nova etiqueta..." value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                <Button onClick={handleAddTag}><PlusCircle className="h-4 w-4 mr-2"/>Adicionar</Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSaveSettings}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
