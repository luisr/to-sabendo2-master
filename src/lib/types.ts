
export interface Comment {
    id: string;
    task_id: string;
    user_id: string;
    text: string;
    created_at: string; // Alterado de 'date' para corresponder ao schema
}

export interface Baseline {
    name: string;
    start_date: Date;
    end_date: Date;
}

export interface Task {
    id: string;
    project_id: string;
    name: string;
    assignee_id: string | null;
    status_id: string;
    priority: "Baixa" | "Média" | "Alta";
    start_date: Date;
    end_date: Date;
    progress?: number;
    dependencies: string[];
    parent_id?: string | null;
    milestone?: boolean;
    tags?: string[];
    comments?: Comment[];
    baselines?: Baseline[]; // Adicionado para consistência com o frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export interface User {
    id: string; // ID é sempre UUID string
    name: string;
    email: string;
    contact?: string;
    avatar: string;
    role: "Admin" | "Gerente" | "Membro";
    status: "Ativo" | "Inativo";
}

export interface Project {
    id: string;
    name: string;
    description: string;
    budget: number;
    spent: number;
    start_date: Date;
    end_date: Date;
    collaborators: {
        user_id: string;
        role: "Gerente" | "Membro";
    }[];
}
