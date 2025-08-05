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
import { useTasks } from '@/hooks/use-tasks';

const baselineFormSchema = z.object({
  name: z.string().min(3, 'O nome da linha de base deve ter pelo menos 3 caracteres.'),
});

interface SetBaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: string | undefined;
}

export default function SetBaselineModal({ isOpen, onClose, selectedProject }: SetBaselineModalProps) {
  const { toast } = useToast();
  const { tasks } = useTasks(); // Usamos o hook para ter acesso às tarefas atuais
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof baselineFormSchema>>({
    resolver: zodResolver(baselineFormSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(values: z.infer<typeof baselineFormSchema>) {
    if (!selectedProject || !tasks || tasks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum projeto selecionado ou nenhuma tarefa para criar a linha de base.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
        // Obter o ID do usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        // 1. Inserir a linha de base principal
        const { data: baselineData, error: baselineError } = await supabase
            .from('project_baselines')
            .insert({
                project_id: selectedProject,
                name: values.name,
                created_by: user.id,
            })
            .select()
            .single();

        if (baselineError) throw baselineError;

        // 2. Preparar as tarefas da linha de base
        const baselineTasks = tasks
            .filter(task => task.start_date && task.end_date) // Apenas tarefas com datas
            .map(task => ({
                baseline_id: baselineData.id,
                original_task_id: task.id,
                start_date: task.start_date,
                end_date: task.end_date,
            }));

        // 3. Inserir as tarefas da linha de base em lote
        if (baselineTasks.length > 0) {
            const { error: tasksError } = await supabase
                .from('baseline_tasks')
                .insert(baselineTasks);

            if (tasksError) throw tasksError;
        }

        toast({
            title: 'Sucesso!',
            description: `Linha de base "${values.name}" criada com ${baselineTasks.length} tarefas.`,
        });
        form.reset();
        onClose();

    } catch (error: any) {
        console.error('Erro ao criar linha de base:', error);
        toast({
            variant: 'destructive',
            title: 'Erro ao criar linha de base',
            description: error.message || 'Ocorreu um erro desconhecido. Tente novamente.',
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
