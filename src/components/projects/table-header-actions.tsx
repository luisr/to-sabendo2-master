"use client";
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Printer } from 'lucide-react';

interface TableHeaderActionsProps {
  isManager: boolean;
  isConsolidatedView: boolean;
  onAddTask: () => void;
  onPrint: () => void;
  onOpenManager: () => void;
  isLoading: boolean; // Adicionando a prop isLoading
}

export default function TableHeaderActions({ 
  isManager, 
  isConsolidatedView, 
  onAddTask, 
  onPrint,
  onOpenManager, 
  isLoading // Recebendo a prop isLoading
}: TableHeaderActionsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        {/* Futuro espaço para filtros */}
      </div>
      <div className="flex gap-2">
        {!isConsolidatedView && isManager && (
          <Button variant="outline" size="sm" onClick={onAddTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onPrint} disabled={isLoading}> {/* Desabilitando o botão se estiver carregando */}
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        {isManager && (
          <Button variant="outline" size="sm" onClick={onOpenManager}>
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar Tabela
          </Button>
        )}
      </div>
    </div>
  );
}
