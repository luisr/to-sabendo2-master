export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Gerente' | 'Membro';
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  project_name?: string; // Adicionado para a visão consolidada
  assignee_id?: string;
  assignee_name?: string;
  status_id: string;
  status_name?: string;
  status_color?: string;
  parent_id?: string | null;
  start_date?: string;
  end_date?: string;
  progress?: number;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  created_at: string;
  wbs_code: string;
  tags: Tag[];
  dependencies: string[];
  subtasks?: Task[];
  observation?: string;
}

export interface Tag {
    id: string;
    name: string;
}

export interface Observation {
    id: string;
    task_id: string;
    user_id: string;
    content?: string;
    file_url?: string;
    created_at: string;
    users: { 
        name: string;
        avatar_url?: string;
    }
}

// Definições para Linha de Base
export interface Baseline {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  created_by: string;
  baseline_tasks: BaselineTask[]; // Aninhando as tarefas da linha de base
}

export interface BaselineTask {
  id: string;
  baseline_id: string;
  original_task_id: string;
  start_date: string;
  end_date: string;
}
