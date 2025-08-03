
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
import type { Project, User } from "@/lib/types";
import { DatePicker } from "../shared/date-picker";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { useUsers } from "@/hooks/use-users";

interface AddProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveProject: (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => void;
  projectToEdit?: Project | null;
}

export default function AddProjectModal({
  isOpen,
  onOpenChange,
  onSaveProject,
  projectToEdit,
}: AddProjectModalProps) {
    const { toast } = useToast();
    const { users, loading: usersLoading } = useUsers();
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState<number | string>('');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    // Adicionar estado para colaboradores se necessário no futuro

    useEffect(() => {
        if (projectToEdit) {
            setName(projectToEdit.name);
            setDescription(projectToEdit.description || '');
            setBudget(projectToEdit.budget || '');
            setStartDate(projectToEdit.start_date ? new Date(projectToEdit.start_date) : undefined);
            setEndDate(projectToEdit.end_date ? new Date(projectToEdit.end_date) : undefined);
        } else {
            // Resetar para um novo projeto
            setName('');
            setDescription('');
            setBudget('');
            setStartDate(undefined);
            setEndDate(undefined);
        }
    }, [projectToEdit, isOpen]);

    const handleSubmit = () => {
        if (!name) {
            toast({ title: "Erro", description: "O nome do projeto é obrigatório.", variant: "destructive" });
            return;
        }
        
        const projectData = {
            name,
            description,
            budget: Number(budget) || 0,
            start_date: startDate?.toISOString().split('T')[0], // Formato YYYY-MM-DD
            end_date: endDate?.toISOString().split('T')[0],   // Formato YYYY-MM-DD
        };
        
        onSaveProject(projectData);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{projectToEdit ? "Editar Projeto" : "Adicionar Novo Projeto"}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes do projeto abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Descrição</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="budget" className="text-right">Orçamento</Label>
                    <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Datas</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                        <DatePicker date={startDate} setDate={setStartDate} placeholder="Data de Início" />
                        <DatePicker date={endDate} setDate={setEndDate} placeholder="Data de Fim" />
                    </div>
                </div>
                {/* A seleção de membros pode ser adicionada aqui no futuro */}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" onClick={handleSubmit}>
                {projectToEdit ? "Salvar Alterações" : "Adicionar Projeto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
