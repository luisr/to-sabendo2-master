"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Task, ProjectBaseline } from '@/lib/types';

const baselineFormSchema = z.object({
  name: z.string().min(3, 'O nome da linha de base deve ter pelo menos 3 caracteres.'),
});

interface SetBaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: { id: string } | null;
  tasks: Task[];
  onSuccess: (newBaseline: ProjectBaseline) => void;
}

const formatDateToISO = (dateInput: string | Date | null): string | null => {
  if (!dateInput) return null;
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new Error(`Data inválida recebida: ${dateInput}`);
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return null;
  }
};

export default function SetBaselineModal({ isOpen, onClose, project, tasks, onSuccess }: SetBaselineModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof baselineFormSchema>>({
    resolver: zodResolver(baselineFormSchema),
    defaultValues: {
      name: `Linha de Base - ${new Date().toLocaleDateString('pt-BR')}`,
    },
  });

  async function onSubmit(values: z.infer<typeof baselineFormSchema>) {
    if (!project || !tasks || tasks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum projeto selecionado ou nenhuma tarefa para criar a linha de base.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: baselineData, error: baselineError } = await supabase
        .from('project_baselines')
        .insert({
          project_id: project.id,
          name: values.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (baselineError) throw new Error(baselineError.message);
      if (!baselineData) throw new Error('Falha ao obter dados da linha de base após a criação.');

      const baselineTasks = tasks
        .map(task => {
          const formattedStartDate = formatDateToISO(task.start_date);
          const formattedEndDate = formatDateToISO(task.end_date);

          if (!formattedStartDate || !formattedEndDate) {
            console.warn(`Tarefa "${task.name}" (ID: ${task.id}) ignorada por ter datas inválidas.`);
            return null;
          }
          
          return {
            baseline_id: baselineData.id,
            original_task_id: task.id,
            name: task.name,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
          };
        })
        .filter(Boolean);

      if (baselineTasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('baseline_tasks')
          .insert(baselineTasks as any);

        if (tasksError) throw new Error(tasksError.message);
      }

      toast({
        title: 'Sucesso!',
        description: `Linha de base "${values.name}" criada com ${baselineTasks.length} tarefas.`,
      });
      onSuccess(baselineData);
      form.reset();
      onClose();

    } catch (error: any) {
      console.error('Erro detalhado ao criar linha de base:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar linha de base',
        description: error.message || 'Ocorreu um erro desconhecido. Verifique o console para detalhes.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir Nova Linha de Base</DialogTitle>
          <DialogDescription>
            Salve o estado atual do cronograma do projeto para comparações futuras.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Linha de Base</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Linha de Base Inicial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Linha de Base
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
