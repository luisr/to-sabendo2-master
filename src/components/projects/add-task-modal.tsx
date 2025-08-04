"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task, User, Tag } from "@/lib/types";
import { DatePicker } from "../shared/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useTableSettings, TaskStatus, Column } from "@/hooks/use-table-settings";
import { parseUTCDate, formatToISODate } from "@/lib/date-utils";
import { MultiSelect } from "../shared/multi-select";

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskData: Omit<Task, 'id' | 'created_at' | 'wbs_code'> & { tag_ids?: string[] }) => void;
  selectedProject: string;
  statuses: TaskStatus[];
  users: User[];
  tasks: Task[];
  tags: Tag[];
}

export default function AddTaskModal({ 
    isOpen, 
    onOpenChange, 
    onSave, 
    selectedProject, 
    statuses = [], 
    users = [], 
    tasks = [],
    tags = []
}: AddTaskModalProps) {
    const { toast } = useToast();
    const { columns } = useTableSettings();
    const [taskData, setTaskData] = useState<Partial<Task> & { tag_ids?: string[], custom_fields?: any }>({});

    useEffect(() => {
        if (isOpen && statuses.length > 0) {
            setTaskData({
                name: "",
                description: "",
                assignee_id: undefined,
                status_id: statuses[0].id,
                priority: "Média",
                start_date: formatToISODate(new Date()),
                end_date: formatToISODate(new Date()),
                project_id: selectedProject,
                progress: 0,
                parent_id: null,
                dependencies: [],
                tag_ids: [],
                custom_fields: {},
            });
        }
    }, [isOpen, statuses, selectedProject]);

    const handleInputChange = (field: keyof typeof taskData, value: any) => {
        setTaskData(prev => ({...prev, [field]: value}));
    }

    const handleCustomFieldChange = (field: string, value: any) => {
        setTaskData(prev => ({
            ...prev,
            custom_fields: {
                ...prev.custom_fields,
                [field]: value,
            }
        }));
    };
    
    const handleDependencyChange = (checked: boolean, dependencyId: string) => {
        const currentDependencies = taskData.dependencies || [];
        const newDependencies = checked ? [...currentDependencies, dependencyId] : currentDependencies.filter(id => id !== dependencyId);
        handleInputChange('dependencies', newDependencies);
    };

    const handleSubmit = () => {
        if (!taskData.name || !taskData.project_id) {
            toast({ title: "Erro de Validação", description: "Nome da tarefa é obrigatório.", variant: "destructive"});
            return;
        }
        onSave(taskData as Omit<Task, 'id' | 'created_at' | 'wbs_code'> & { tag_ids: string[] });
        onOpenChange(false);
    };

    const tagOptions = tags.map(tag => ({ value: tag.id, label: tag.name }));
    const customColumns = columns.filter(col => col.id.startsWith('custom_'));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
          <DialogDescription>Preencha os detalhes da tarefa e suas dependências.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Tarefa</Label>
            <Input id="name" value={taskData.name || ""} onChange={(e) => handleInputChange('name', e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Descrição</Label>
            <Textarea id="description" value={taskData.description || ""} onChange={(e) => handleInputChange('description', e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="parent_id" className="text-right">Subtarefa de</Label>
             <Select value={taskData.parent_id || "null"} onValueChange={(value) => handleInputChange('parent_id', value === "null" ? null : value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Nenhuma (tarefa principal)"/></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="null">Nenhuma (tarefa principal)</SelectItem>
                      {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.wbs_code} - {t.name}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignee_id" className="text-right">Responsável</Label>
             <Select value={taskData.assignee_id || ''} onValueChange={(value) => handleInputChange('assignee_id', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione um responsável"/></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status_id" className="text-right">Status</Label>
            <Select value={taskData.status_id || ''} onValueChange={(value) => handleInputChange('status_id', value)}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <div className="col-span-3">
                <MultiSelect
                    options={tagOptions}
                    selected={taskData.tag_ids || []}
                    onChange={(selected) => handleInputChange('tag_ids', selected)}
                    placeholder="Selecione as tags"
                />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">Prioridade</Label>
            <Select value={taskData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">Progresso</Label>
             <div className="col-span-3 flex items-center gap-2">
                <Slider value={[taskData.progress || 0]} onValueChange={(value) => handleInputChange('progress', value[0])} max={100} step={1} className="w-[80%]" />
                <span>{taskData.progress || 0}%</span>
            </div>
           </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start_date" className="text-right">Início</Label>
            <div className="col-span-3">
              <DatePicker date={parseUTCDate(taskData.start_date)} onDateChange={(date) => handleInputChange('start_date', formatToISODate(date))}/>
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end_date" className="text-right">Fim</Label>
            <div className="col-span-3">
               <DatePicker date={parseUTCDate(taskData.end_date)} onDateChange={(date) => handleInputChange('end_date', formatToISODate(date))}/>
            </div>
          </div>
          {customColumns.map(col => (
            <div key={col.id} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={col.id} className="text-right">{col.name}</Label>
                <div className="col-span-3">
                    {col.type === 'text' && <Input id={col.id} onChange={(e) => handleCustomFieldChange(col.id, e.target.value)} />}
                    {col.type === 'number' && <Input type="number" id={col.id} onChange={(e) => handleCustomFieldChange(col.id, e.target.value)} />}
                    {col.type === 'date' && <DatePicker onDateChange={(date) => handleCustomFieldChange(col.id, formatToISODate(date))} />}
                    {col.type === 'progress' && <Slider onValueChange={(value) => handleCustomFieldChange(col.id, value[0])} max={100} step={1} />}
                </div>
            </div>
          ))}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Dependências</Label>
            <div className="col-span-3">
                <ScrollArea className="h-32 w-full rounded-md border p-4">
                    {tasks.length > 0 ? (
                        tasks.map(dep => (
                            <div key={dep.id} className="flex items-center space-x-2 mb-2">
                                <Checkbox 
                                    id={`add-dep-${dep.id}`} 
                                    checked={(taskData.dependencies || []).includes(dep.id)}
                                    onCheckedChange={(checked) => handleDependencyChange(!!checked, dep.id)}
                                />
                                <label htmlFor={`add-dep-${dep.id}`} className="text-sm font-medium leading-none">
                                    {dep.wbs_code} - {dep.name}
                                </label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma outra tarefa para definir como dependência.</p>
                    )}
                </ScrollArea>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" onClick={handleSubmit}>Salvar Tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
