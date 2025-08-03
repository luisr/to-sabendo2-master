
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task } from "@/lib/types";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { Slider } from "../ui/slider";
import { DatePicker } from "../shared/date-picker";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";
import ChangeHistoryModal from "./change-history-modal";
import { useTasks } from "@/hooks/use-tasks";

interface ViewTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  customColumns: { name: string; type: string }[];
}

export default function ViewTaskModal({
  isOpen,
  onOpenChange,
  task,
  customColumns,
}: ViewTaskModalProps) {
  const { tasks: allTasks, updateTask, userId } = useTasks();
  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [tempDates, setTempDates] = useState<{start: Date, end: Date} | null>(null);

  useEffect(() => {
    if (isOpen) {
        const fullTask = allTasks.find(t => t.id === task?.id);
        setCurrentTask(fullTask || null);
    }
  }, [task, isOpen, allTasks]);
  
  if (!currentTask) return null;

  const originalTask = allTasks.find(t => t.id === currentTask.id);

  const handleAddComment = () => {
    if (newComment.trim() === "" || !originalTask || !userId) return;

    const comment = {
      user_id: userId,
      text: newComment,
      created_at: new Date().toISOString(),
      task_id: currentTask.id,
    };

    const updatedTask = {
      ...currentTask,
      comments: [...(currentTask.comments || []), comment],
    };
    
    updateTask(updatedTask, originalTask);
    setCurrentTask(updatedTask);
    setNewComment("");

    toast({
        title: "Novo Comentário Adicionado",
        description: `Uma notificação foi enviada aos participantes da tarefa "${currentTask.name}".`
    })
  };

  const handleDateChange = (field: 'start_date' | 'end_date', date?: Date) => {
    if (!date) return;
    setTempDates(prev => ({
        start: field === 'start_date' ? date : (prev?.start || new Date(currentTask.start_date)),
        end: field === 'end_date' ? date : (prev?.end || new Date(currentTask.end_date))
    }));
    setIsHistoryModalOpen(true);
  }

  const handleSaveWithReason = (reason: string) => {
     if (!tempDates || !originalTask || !userId) return;
     const newComment = {
        user_id: userId,
        text: reason,
        created_at: new Date().toISOString(),
        task_id: currentTask.id,
    };

    const updatedTaskWithDateChange = {
        ...currentTask,
        start_date: tempDates.start,
        end_date: tempDates.end,
        comments: [...(currentTask.comments || []), newComment]
    };
    
    updateTask(updatedTaskWithDateChange, originalTask);
    setCurrentTask(updatedTaskWithDateChange); // Update local state as well
    setIsHistoryModalOpen(false);
    setTempDates(null);
  }


  const potentialDependencies = allTasks.filter(
    (t) => t.project_id === currentTask.project_id && t.id !== currentTask.id
  );
  
  const getSubtreeIds = (taskId: string): string[] => {
    const subtree: string[] = [taskId];
    const children = allTasks.filter(t => t.parent_id === taskId);
    for (const child of children) {
        subtree.push(...getSubtreeIds(child.id));
    }
    return subtree;
  };

  const disabledParentSelectionIds = getSubtreeIds(currentTask.id);
  
  const potentialParentTasks = allTasks.filter(
    (t) => t.project_id === currentTask.project_id && !disabledParentSelectionIds.includes(t.id)
  );


  const renderCustomField = (column: { name: string; type: string }) => {
    const { name, type } = column;
    const value = currentTask[name as keyof Task];

    switch (type) {
      case "numero":
        return (
          <Input
            id={name}
            type="number"
            value={(value as number) || ''}
            readOnly
            className="col-span-3 bg-muted"
          />
        );
      case "progresso":
        return (
          <div className="col-span-3 flex items-center gap-2">
            <Slider 
                value={[(value as number) || 0]} 
                max={100} 
                step={1} 
                className="w-[80%]"
                disabled
            />
            <span>{(value as number) || 0}%</span>
          </div>
        );
      case "cronograma":
         return (
          <div className="col-span-3 grid grid-cols-2 gap-2">
              <DatePicker
                date={currentTask[`${name}_start`]}
                onDateChange={() => {}}
                disabled
              />
              <DatePicker
                date={currentTask[`${name}_end`]}
                onDateChange={() => {}}
                disabled
              />
          </div>
        );
      case "formula":
        return <Input id={name} value="Calculado automaticamente" readOnly className="col-span-3 bg-muted" />;
      case "texto":
      default:
        return (
          <Input
            id={name}
            value={(value as string) || ''}
            readOnly
            className="col-span-3 bg-muted"
          />
        );
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Visualizar Tarefa</DialogTitle>
          <DialogDescription>
            Veja os detalhes da tarefa, gerencie suas dependências e adicione comentários.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto p-1">
          {/* Coluna Esquerda: Detalhes da Tarefa */}
          <div className="space-y-4">
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                Tarefa
                </Label>
                <Input
                id="name"
                value={currentTask.name}
                readOnly
                className="col-span-3 bg-muted"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignee" className="text-right">
                Responsável
                </Label>
                <Input
                id="assignee"
                value={currentTask.assignee_id || ''}
                readOnly
                className="col-span-3 bg-muted"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                Status
                </Label>
                <Input id="status" value={currentTask.status_id} readOnly className="col-span-3 bg-muted"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                Prioridade
                </Label>
                <Input id="priority" value={currentTask.priority} readOnly className="col-span-3 bg-muted"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="progress" className="text-right">
                Progresso
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Slider 
                        value={[currentTask.progress || 0]} 
                        max={100} 
                        step={1} 
                        className="w-[80%]"
                        disabled
                    />
                    <span>{currentTask.progress || 0}%</span>
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start" className="text-right">
                Início
                </Label>
                <div className="col-span-3">
                    <DatePicker 
                        date={new Date(currentTask.start_date)} 
                        onDateChange={(date) => handleDateChange('start_date', date)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end" className="text-right">
                Fim
                </Label>
                <div className="col-span-3">
                    <DatePicker 
                        date={new Date(currentTask.end_date)} 
                        onDateChange={(date) => handleDateChange('end_date', date)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parentId" className="text-right">
                    Tarefa Pai
                </Label>
                <Select value={currentTask.parent_id || "null"} disabled>
                    <SelectTrigger className="col-span-3 bg-muted">
                        <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {potentialParentTasks.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="tags" className="text-right pt-2">
                        Etiquetas
                    </Label>
                    <div className="col-span-3">
                        <div className="flex flex-wrap gap-1 p-2 rounded-md bg-muted min-h-[40px]">
                            {(currentTask.tags || []).map(tag => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            {customColumns.map(col => (
                <div key={col.name} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={col.name} className="text-right capitalize">
                        {col.name}
                    </Label>
                    {renderCustomField(col)}
                </div>
            ))}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                    Dependências
                </Label>
                <div className="col-span-3">
                    <ScrollArea className="h-32 w-full rounded-md border p-4 bg-muted">
                        {potentialDependencies.length > 0 ? (
                            potentialDependencies.map(dep => (
                                <div key={dep.id} className="flex items-center space-x-2 mb-2">
                                    <Checkbox 
                                        id={`dep-view-${dep.id}`} 
                                        checked={(currentTask.dependencies || []).includes(dep.id)}
                                        disabled
                                    />
                                    <label htmlFor={`dep-view-${dep.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {dep.name}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma outra tarefa neste projeto para definir como dependência.</p>
                        )}
                    </ScrollArea>
                </div>
            </div>
          </div>

          {/* Coluna Direita: Comentários */}
          <div className="space-y-4 flex flex-col">
            <h4 className="font-medium">Comentários e Histórico de Alterações</h4>
            <Separator />
            <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-4">
                    {(currentTask.comments || []).length > 0 ? (
                        currentTask.comments?.map((comment, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback>{comment.user_id ? comment.user_id.substring(0, 2) : '??'}</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted p-3 rounded-lg w-full">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm">{comment.user_id}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <p className="text-sm mt-1">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                    )}
                </div>
            </ScrollArea>
             <div className="space-y-2 pt-2">
                <Label htmlFor="new-comment">Adicionar Comentário</Label>
                <Textarea 
                    id="new-comment" 
                    placeholder="Digite seu comentário..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <Button onClick={handleAddComment} size="sm">Publicar Comentário</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {currentTask && (
        <ChangeHistoryModal
            isOpen={isHistoryModalOpen}
            onOpenChange={setIsHistoryModalOpen}
            task={currentTask}
            onSave={handleSaveWithReason}
        />
    )}
    </>
  );
}
