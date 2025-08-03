

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, BarChart, FilePieChart, LineChart, ListTodo, Trash2 } from "lucide-react";
import AddWidgetModal from "./add-widget-modal";
import type { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";

type Preferences = ReturnType<typeof useDashboardPreferences>['preferences'];

interface DashboardManagerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  setPreference: (key: keyof Preferences, value: boolean) => void;
  onSave: () => void;
}

const kpiItems = [
    { id: 'kpiBudget', name: 'KPI: Orçamento Utilizado' },
    { id: 'kpiCompletedTasks', name: 'KPI: Tarefas Concluídas' },
    { id: 'kpiRisk', name: 'KPI: Risco do Projeto' },
    { id: 'kpiCompletion', name: 'KPI: Média de Conclusão' },
];

const chartItems = [
    { id: 'chartOverview', name: 'Gráfico: Visão Geral das Tarefas' },
    { id: 'cardRecentProjects', name: 'Card: Projetos Recentes' },
    { id: 'cardRecentTasks', name: 'Card: Tarefas Recentes' },
]

export default function DashboardManagerModal({
  isOpen,
  onOpenChange,
  preferences,
  setPreference,
  onSave
}: DashboardManagerModalProps) {

  const handleSave = () => {
    onSave();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Painel</DialogTitle>
          <DialogDescription>
            Personalize os KPIs e gráficos exibidos em seu painel.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-sm px-1">Widgets Visíveis</h4>
            {[...kpiItems, ...chartItems].map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <Label htmlFor={`vis-${item.id}`} className="flex items-center gap-2 cursor-pointer">
                      <ListTodo className="h-4 w-4 text-muted-foreground"/>
                      {item.name}
                    </Label>
                    <Switch
                        id={`vis-${item.id}`}
                        checked={preferences[item.id as keyof Preferences] ?? false}
                        onCheckedChange={(checked) => setPreference(item.id as keyof Preferences, checked)}
                    />
                </div>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Preferências</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
