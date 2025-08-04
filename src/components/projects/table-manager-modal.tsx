"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTableSettings, TaskStatus, Tag, ColumnType } from "@/hooks/use-table-settings";
import { Trash2, PlusCircle, Copy, Edit, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TableManagerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TableManagerModal({ isOpen, onOpenChange }: TableManagerModalProps) {
  const { 
    statuses, tags, addStatus, updateStatus, deleteStatus, 
    addTag, updateTag, deleteTag, 
    visibleColumns, setVisibleColumns, 
    columns, addColumn, updateColumn, duplicateColumn, deleteColumn 
  } = useTableSettings();
  const { toast } = useToast();

  const [localStatuses, setLocalStatuses] = useState<TaskStatus[]>([]);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#808080");
  const [newTagName, setNewTagName] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [editingColumnType, setEditingColumnType] = useState<ColumnType>("text");
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

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    addColumn(newColumnName, newColumnType);
    setNewColumnName("");
    toast({ title: "Coluna adicionada com sucesso!" });
  };
  
  const handleColumnVisibilityChange = (columnId: string, checked: boolean) => {
    setLocalVisibleColumns(prev => 
        checked ? [...prev, columnId] : prev.filter(id => id !== columnId)
    );
  };

  const handleStartEditing = (column: { id: string, name: string, type: ColumnType }) => {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
    setEditingColumnType(column.type);
  };

  const handleConfirmEdit = () => {
    if (editingColumnId && editingColumnName.trim()) {
      updateColumn(editingColumnId, editingColumnName, editingColumnType);
      setEditingColumnId(null);
      setEditingColumnName("");
      toast({ title: "Coluna atualizada com sucesso!" });
    }
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
            <h4 className="font-semibold">Gerenciar Colunas</h4>
            <div className="grid grid-cols-1 gap-4">
                {columns.map(col => (
                    <div key={col.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id={col.id} 
                                checked={localVisibleColumns.includes(col.id)}
                                onCheckedChange={(checked) => handleColumnVisibilityChange(col.id, !!checked)}
                            />
                            {editingColumnId === col.id ? (
                                <Input 
                                    value={editingColumnName}
                                    onChange={(e) => setEditingColumnName(e.target.value)}
                                    onBlur={handleConfirmEdit}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit()}
                                    autoFocus
                                />
                            ) : (
                                <Label htmlFor={col.id}>{col.name}</Label>
                            )}
                        </div>
                        <div className="flex items-center">
                           {editingColumnId === col.id ? (
                                <Select value={editingColumnType} onValueChange={(value) => setEditingColumnType(value as ColumnType)}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="number">Número</SelectItem>
                                        <SelectItem value="date">Data</SelectItem>
                                        <SelectItem value="progress">Progresso</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Label className="text-sm text-muted-foreground w-[120px] text-right">{col.type}</Label>
                            )}
                            {editingColumnId === col.id ? (
                                <Button variant="ghost" size="icon" onClick={handleConfirmEdit}>
                                    <Check className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => handleStartEditing(col)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => duplicateColumn(col.id)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteColumn(col.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 pt-4 border-t">
                <Input placeholder="Nova coluna..." value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} />
                <Select value={newColumnType} onValueChange={(value) => setNewColumnType(value as ColumnType)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="progress">Progresso</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleAddColumn}><PlusCircle className="h-4 w-4 mr-2"/>Adicionar</Button>
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
