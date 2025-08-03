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
import type { Task, User } from "@/lib/types";
import { DatePicker } from "../shared/date-picker";
import { useToast } from "@/hooks/use-toast";
import { TaskStatus } from "@/hooks/use-table-settings";
import { parseUTCDate, formatToISODate } from "@/lib/date-utils";
import ChangeHistoryModal from './change-history-modal';

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskData: Partial<Task> & { id: string }, reason?: string) => void;
  task: Task;
  statuses: TaskStatus[];
  users: User[];
  tasks: Task[];
}

export default function EditTaskModal({ isOpen, onOpenChange, onSave, task, statuses = [], users = [], tasks = [] }: EditTaskModalProps) {
    const { toast } = useToast();
    const [taskData, setTaskData] = useState<Partial<Task>>({});
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Usar useMemo para garantir que o estado original seja capturado corretamente
    const originalTask = useMemo(() => task, [task]);

    useEffect(() => {
        if (isOpen) {
            setTaskData({
                ...task,
                // Garantir que as dependências sejam um array para o estado
                dependencies: task.dependencies || [],
            });
        }
    }, [isOpen, task]);

    const handleInputChange = (field: keyof Task, value: any) => {
        setTaskData(prev => ({...prev, [field]: value}));
    }

    const handleSubmit = () => {
        if (!taskData.id) return;

        // **A CORREÇÃO: Comparar as strings de data normalizadas**
        const originalStartDate = formatToISODate(parseUTCDate(originalTask.start_date));
        const newStartDate = formatToISODate(parseUTCDate(taskData.start_date));
        const originalEndDate = formatToISODate(parseUTCDate(originalTask.end_date));
        const newEndDate = formatToISODate(parseUTCDate(taskData.end_date));

        const datesChanged = originalStartDate !== newStartDate || originalEndDate !== newEndDate;

        if (datesChanged) {
            setIsHistoryModalOpen(true);
        } else {
            handleSaveWithReason(); // Salvar sem motivo se as datas não mudaram
        }
    };

    const handleSaveWithReason = (reason?: string) => {
        if (!taskData.id) return;
        
        const cleanTaskData = {
            id: taskData.id,
            name: taskData.name,
            description: taskData.description,
            assignee_id: taskData.assignee_id,
            status_id: taskData.status_id,
            priority: taskData.priority,
            progress: taskData.progress,
            start_date: formatToISODate(parseUTCDate(taskData.start_date)),
            end_date: formatToISODate(parseUTCDate(taskData.end_date)),
            parent_id: taskData.parent_id,
            dependencies: taskData.dependencies || [],
        };

        onSave(cleanTaskData, reason);
        setIsHistoryModalOpen(false);
        onOpenChange(false);
    };

    // ... (resto do componente)

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {/* ... (conteúdo do modal) ... */}
        </Dialog>
        <ChangeHistoryModal
            isOpen={isHistoryModalOpen}
            onOpenChange={setIsHistoryModalOpen}
            onSave={handleSaveWithReason}
        />
    </>
  );
}
