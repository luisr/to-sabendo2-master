
"use client";

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
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
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/lib/types';

interface ImportProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (projectData: Partial<Project>, tasks: any[]) => void;
  project?: Project | null;
}

export default function ImportProjectModal({ isOpen, onOpenChange, onImport, project = null }: ImportProjectModalProps) {
  const { toast } = useToast();
  const [projectData, setProjectData] = useState<Partial<Project>>({ name: '', description: '' });
  const [tasks, setTasks] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  
  const isImportingToExisting = !!project;

  useEffect(() => {
    if (isOpen) {
        setProjectData({ name: project?.name || '', description: project?.description || '' });
        setTasks([]);
        setFileName('');
    }
  }, [isOpen, project]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setTasks(results.data);
        },
        error: (error: any) => {
          toast({
            title: "Erro no parsing",
            description: "Houve um problema ao ler o arquivo CSV.",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleImportClick = () => {
    if (!isImportingToExisting && !projectData.name) {
        toast({ title: "Erro", description: "O nome do projeto é obrigatório.", variant: "destructive"});
        return;
    }
    if (tasks.length === 0) {
        toast({ title: "Erro", description: "Nenhuma tarefa para importar. Verifique seu arquivo.", variant: "destructive"});
        return;
    }
    onImport(projectData, tasks);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isImportingToExisting ? `Importar Tarefas para "${project?.name || ''}"` : "Importar Novo Projeto de CSV"}</DialogTitle>
          <DialogDescription>
            Carregue um arquivo CSV com a lista de tarefas. As colunas esperadas são: name, start_date, end_date, progress, priority.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {!isImportingToExisting && (
                <div>
                    <Label htmlFor="project-name">Nome do Novo Projeto</Label>
                    <Input id="project-name" value={projectData.name || ''} onChange={(e) => setProjectData(p => ({...p, name: e.target.value}))} />
                    <Label htmlFor="project-description" className="mt-4">Descrição</Label>
                    <Textarea id="project-description" value={projectData.description || ''} onChange={(e) => setProjectData(p => ({...p, description: e.target.value}))} />
                </div>
            )}
            <div className={isImportingToExisting ? 'md:col-span-2' : ''}>
                <Label htmlFor="csv-file">Arquivo CSV de Tarefas</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                {fileName && <p className="text-sm text-muted-foreground mt-2">Arquivo selecionado: {fileName}</p>}
            </div>
        </div>
        
        {tasks.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Object.keys(tasks[0]).map(key => <TableHead key={key}>{key}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map((row, i) => (
                            <TableRow key={i}>
                                {Object.values(row).map((val: any, j) => <TableCell key={j}>{val}</TableCell>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImportClick} disabled={tasks.length === 0 || (!isImportingToExisting && !projectData.name)}>Importar Tarefas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
