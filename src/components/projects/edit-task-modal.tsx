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
import type { Task, User, Tag, TaskStatus } from "@/lib/types";
import { DatePicker } from "../shared/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useTableSettings } from "@/hooks/use-table-settings";
import { parseUTCDate, formatToISODate } from "@/lib/date-utils";
import ChangeHistoryModal from './change-history-modal';
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MultiSelect } from "../shared/multi-select";

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: (updatedData: Partial<Task>) => void; // Passa os dados atualizados
  task: Task;
  statuses: TaskStatus[];
  users: User[];
  tasks: Task[];
  tags: Tag[];
}

export default function EditTaskModal({ 
    isOpen, 
    onOpenChange, 
    onTaskUpdate, 
    task, 
    statuses = [], 
    users = [], 
    tasks = [],
    tags = [] 
}: EditTaskModalProps) {
    const { toast } = useToast();
    const { columns } = useTableSettings();
    const [taskData, setTaskData] = useState<Partial<Task> & { custom_fields?: any } | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const originalTask = useMemo(() => task, [task]);

    useEffect(() => {
        if (isOpen && task) {
            setTaskData({ ...task, custom_fields: task.custom_fields || {} });
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

    const handleCustomFieldChange = (field: string, value: any) => {
        if (taskData) {
            setTaskData(prev => ({
                ...prev,
                custom_fields: {
                    ...prev.custom_fields,
                    [field]: value,
                }
            }));
        }
    };
    
    const handleDateChange = (field: 'start_date' | 'end_date', date: Date | undefined) => {
        if (taskData) {
             setTaskData(prev => ({ ...prev, [field]: date ? formatToISODate(date) : null }));
        }
    };

    const handleParentTaskChange = (value: string) => {
        const newParentId = value === 'none' ? null : value;
        handleInputChange('parent_id', newParentId);
    };
    
    const handleSaveWithReason = async (reason: string = "") => {
        if (!taskData?.id) return;
        
        const dataForUpdate: Partial<Task> & { tag_ids?: string[] } = {
            name: taskData.name,
            description: taskData.description,
            assignee_id: taskData.assignee_id,
            status_id: taskData.status_id,
            priority: taskData.priority,
            progress: taskData.progress,
            start_date: taskData.start_date,
            end_date: taskData.end_date,
            parent_id: taskData.parent_id,
            dependencies: (taskData.dependencies || []).map(d => typeof d === 'object' ? d.id : d),
            custom_fields: taskData.custom_fields,
            tag_ids: selectedTagIds,
        };
        
        onTaskUpdate(dataForUpdate); // Chama a função de atualização com os dados
        
        // Se houver motivo, salva no histórico (opcional, dependendo da sua lógica de RPC)
        if (reason) {
           const { error } = await supabase.rpc('update_task_with_history', {
                p_task_id: taskData.id,
                p_reason: reason,
                ...dataForUpdate 
            });
            if (error) {
                toast({ title: "Erro ao salvar histórico", description: error.message, variant: "destructive" });
            }
        }
        
        setIsHistoryModalOpen(false);
        onOpenChange(false);
    };

    const handleSubmit = () => {
        if (!taskData?.id) return;
        const datesChanged = originalTask.start_date !== taskData.start_date || originalTask.end_date !== taskData.end_date;
        if (datesChanged) {
            setIsHistoryModalOpen(true);
        } else {
            handleSaveWithReason();
        }
    };
    
    const availableParentTasks = tasks.filter(t => t.id !== task?.id);
    const tagOptions = tags.map(tag => ({ value: tag.id, label: tag.name }));
    const customColumns = columns.filter(col => col.id.startsWith('custom_'));

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
                    
                    {taskData ? (
                        <ScrollArea className="h-[60vh] p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                            <DatePicker date={parseUTCDate(taskData.start_date)} onDateChange={(d) => handleDateChange('start_date', d)} />
                                        </div>
                                        <div>
                                            <Label htmlFor="end_date">Data de Fim</Label>
                                            <DatePicker date={parseUTCDate(taskData.end_date)} onDateChange={(d) => handleDateChange('end_date', d)} />
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
                                        <MultiSelect
                                            options={tagOptions}
                                            selected={selectedTagIds}
                                            onChange={setSelectedTagIds}
                                            placeholder="Selecione as tags"
                                        />
                                    </div>
                                </div>
                                {customColumns.map(col => (
                                    <div key={col.id} className="space-y-2">
                                        <Label htmlFor={col.id}>{col.name}</Label>
                                        {col.type === 'text' && <Input id={col.id} value={taskData.custom_fields?.[col.id] || ''} onChange={(e) => handleCustomFieldChange(col.id, e.target.value)} />}
                                        {col.type === 'number' && <Input type="number" id={col.id} value={taskData.custom_fields?.[col.id] || ''} onChange={(e) => handleCustomFieldChange(col.id, e.target.value)} />}
                                        {col.type === 'date' && <DatePicker date={parseUTCDate(taskData.custom_fields?.[col.id])} onDateChange={(date) => handleCustomFieldChange(col.id, formatToISODate(date))} />}
                                        {col.type === 'progress' && <Slider value={[taskData.custom_fields?.[col.id] || 0]} onValueChange={(value) => handleCustomFieldChange(col.id, value[0])} max={100} step={1} />}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex items-center justify-center h-[60vh]">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                    
                    <DialogFooter className="pt-4">
                        <Button onClick={handleSubmit} disabled={!taskData}>Salvar Alterações</Button>
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
