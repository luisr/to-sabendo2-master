"use client";
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Printer, Network } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, TaskStatus } from "@/lib/types";

interface TableHeaderActionsProps {
  isManager: boolean;
  isConsolidatedView: boolean;
  onAddTask: () => void;
  onPrint: () => void;
  onOpenManager: () => void;
  onSetSubtask: () => void;
  isLoading: boolean;
  selectedTasks: Set<string>;
  // Props para os filtros
  statuses: TaskStatus[];
  users: User[];
  statusFilter: string;
  onStatusChange: (value: string) => void;
  userFilter: string;
  onUserChange: (value: string) => void;
}

export default function TableHeaderActions({
  isManager,
  isConsolidatedView,
  onAddTask,
  onPrint,
  onOpenManager,
  onSetSubtask,
  isLoading,
  selectedTasks,
  // Filtros
  statuses,
  users,
  statusFilter,
  onStatusChange,
  userFilter,
  onUserChange,
}: TableHeaderActionsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        {/* Filtros da Tabela */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={onUserChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por responsável..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        {!isConsolidatedView && isManager && (
          <Button variant="outline" size="sm" onClick={onAddTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        )}
        {isManager && selectedTasks.size > 0 && (
          <Button variant="outline" size="sm" onClick={onSetSubtask}>
            <Network className="h-4 w-4 mr-2" />
            Definir como Subtarefa
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onPrint} disabled={isLoading}>
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
