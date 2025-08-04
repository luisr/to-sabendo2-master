"use client";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task, User, Tag, TaskStatus } from "@/lib/types";
import { DatePicker } from "../shared/date-picker";
import { useToast } from "@/hooks/use-toast";
import { parseUTCDate, formatToISODate } from "@/lib/date-utils";
import ChangeHistoryModal from './change-history-modal';
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTags } from "@/hooks/use-tags";

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: () => void; // Propriedade corrigida
  task: Task;
  statuses: TaskStatus[];
  users: User[];
  tasks: Task[];
}

export default function EditTaskModal({ isOpen, onOpenChange, onTaskUpdate, task, statuses = [], users = [], tasks = [] }: EditTaskModalProps) {
    const { toast } = useToast();
    const { tags: availableTags, loading: loadingTags } = useTags();
    const [taskData, setTaskData] = useState<Partial<Task> | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const originalTask = useMemo(() => task, [task]);

    useEffect(() => {
        if (isOpen && task) {
            setTaskData({ ...task });
            setSelectedTagIds((task.tags || []).map(t => t.id));
        } else {
            setTaskData(null);
            setSelectedTagIds([]);
        }
    }, [isOpen, task]);

    const handleInputChange = (field: keyof Task, value: any) => {
        if (taskData) {
            setTaskData(prev => ({...prev, [field]: value}));
        }
    };
    
    const handleDateChange = (field: 'start_date' | 'end_date', date: Date | undefined) => {
        if (taskData) {
             setTaskData(prev => ({ ...prev, [field]: date ? date.toISOString() : null }));
        }
    };

    const handleParentTaskChange = (value: string) => {
        const newParentId = value === 'none' ? null : value;
        handleInputChange('parent_id', newParentId);
    };

    const handleTagChange = (tagId: string, checked: boolean) => {
        setSelectedTagIds(prev =>
            checked ? [...prev, tagId] : prev.filter(id => id !== tagId)
        );
    };
    
    const handleSaveWithReason = async (reason?: string) => {
        if (!taskData?.id) return;
        
        const { error } = await supabase.rpc('update_task_with_tags', {
            p_task_id: taskData.id,
            p_name: taskData.name,
            p_description: taskData.description,
            p_assignee_id: taskData.assignee_id,
            p_status_id: taskData.status_id,
            p_priority: taskData.priority,
            p_progress: taskData.progress,
            p_start_date: formatToISODate(parseUTCDate(taskData.start_date)),
            p_end_date: formatToISODate(parseUTCDate(taskData.end_date)),
            p_parent_id: taskData.parent_id,
            p_dependencies: (taskData.dependencies || []).map(d => typeof d === 'object' ? d.id : d),
            p_tag_ids: selectedTagIds
        });

        if (error) {
            toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Tarefa atualizada com sucesso!" });
            onTaskUpdate(); // Notificar a página para recarregar os dados
        }

        setIsHistoryModalOpen(false);
        onOpenChange(false);
    };

    const handleSubmit = () => {
        if (!taskData?.id) return;
        const datesChanged = formatToISODate(parseUTCDate(originalTask.start_date)) !== formatToISODate(parseUTCDate(taskData.start_date)) ||
                              formatToISODate(parseUTCDate(originalTask.end_date)) !== formatToISODate(parseUTCDate(taskData.end_date));
        if (datesChanged) {
            setIsHistoryModalOpen(true);
        } else {
            handleSaveWithReason();
        }
    };
    
    const availableParentTasks = tasks.filter(t => t.id !== task?.id);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Editar Tarefa</DialogTitle>
                        <DialogDescription>
                            Faça alterações na sua tarefa aqui. Clique em salvar quando terminar.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {taskData && !loadingTags ? (
                        <ScrollArea className="h-[60vh] p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* O resto do formulário permanece o mesmo */}
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Nome da Tarefa</Label>
                                        <Input id="name" value={taskData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                                    </div>
                                    <div>
                                        <Label htmlFor="description">Descrição</Label>
                                        <Textarea id="description" value={taskData.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="start_date">Data de Início</Label>
                                            <DatePicker date={taskData.start_date ? parseUTCDate(taskData.start_date) : undefined} setDate={(d) => handleDateChange('start_date', d)} />
                                        </div>
                                        <div>
                                            <Label htmlFor="end_date">Data de Fim</Label>
                                            <DatePicker date={taskData.end_date ? parseUTCDate(taskData.end_date) : undefined} setDate={(d) => handleDateChange('end_date', d)} />
                                        </div>
                                    </div>
                                     <div>
                                        <Label>Progresso: {taskData.progress || 0}%</Label>
                                        <Slider defaultValue={[0]} value={[taskData.progress || 0]} onValueChange={(value) => handleInputChange('progress', value[0])} max={100} step={1} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     <div>
                                        <Label htmlFor="assignee_id">Responsável</Label>
                                        <Select value={taskData.assignee_id || undefined} onValueChange={(value) => handleInputChange('assignee_id', value)}>
                                            <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                                            <SelectContent>
                                                {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="status_id">Status</Label>
                                            <Select value={taskData.status_id || undefined} onValueChange={(value) => handleInputChange('status_id', value)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione um status" /></SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map(status => <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="priority">Prioridade</Label>
                                             <Select value={taskData.priority || undefined} onValueChange={(value) => handleInputChange('priority', value)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Baixa">Baixa</SelectItem>
                                                    <SelectItem value="Média">Média</SelectItem>
                                                    <SelectItem value="Alta">Alta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                     <div>
                                        <Label htmlFor="parent_id">Tarefa Pai</Label>
                                        <Select value={taskData.parent_id || 'none'} onValueChange={handleParentTaskChange}>
                                            <SelectTrigger><SelectValue placeholder="Selecione uma tarefa pai" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhuma</SelectItem>
                                                {availableParentTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div>
                                        <Label>Tags</Label>
                                        <ScrollArea className="h-24 border rounded-md p-2">
                                            {availableTags.map(tag => (
                                                <div key={tag.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`tag-${tag.id}`}
                                                        checked={selectedTagIds.includes(tag.id)}
                                                        onCheckedChange={(checked) => handleTagChange(tag.id, !!checked)}
                                                    />
                                                    <Label htmlFor={`tag-${tag.id}`}>{tag.name}</Label>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex items-center justify-center h-[60vh]">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                    
                    <DialogFooter className="pt-4">
                        <Button onClick={handleSubmit} disabled={!taskData || loadingTags}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ChangeHistoryModal
                isOpen={isHistoryModalOpen}
                onOpenChange={setIsHistoryModalOpen}
                onSave={handleSaveWithReason}
            />
        </>
    );
}
