-- =============================================================================
--  SETUP COMPLETO DO BANCO DE DADOS - PROJETO "TO SABENDO"
--  Este script mestre e definitivo executa todas as etapas necessárias para
--  configurar o banco de dados do zero. É totalmente idempotente.
--
--  ORDEM DE EXECUÇÃO:
--  1. Habilitação de Extensões e Criação de Tipos (Schema)
--  2. Criação das Tabelas (Schema)
--  3. Criação de Funções e Triggers (Functions)
--  4. Aplicação das Políticas de Segurança (RLS)
--  5. Inserção de Dados Iniciais (Seed)
-- =============================================================================

-- ========= PART 1: SCHEMA SETUP (TABLES, TYPES, EXTENSIONS) =========

-- 1.1 HABILITAR EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.2 CRIAR TIPOS ENUM
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('Admin', 'Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('Baixa', 'Média', 'Alta', 'Urgente'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.collaborator_role AS ENUM ('Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.custom_column_type AS ENUM ('texto', 'numero', 'data', 'formula'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1.3 CRIAR TABELAS NA ORDEM DE DEPENDÊNCIA
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    email text UNIQUE,
    avatar text,
    role user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    budget numeric(12, 2) DEFAULT 0.00,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_is_positive CHECK (budget >= 0)
);

CREATE TABLE IF NOT EXISTS public.collaborators (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role collaborator_role NOT NULL DEFAULT 'Membro',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_statuses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    color text DEFAULT '#808080',
    display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    color text DEFAULT '#cccccc'
);

CREATE TABLE IF NOT EXISTS public.custom_columns (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    type custom_column_type NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    priority task_priority DEFAULT 'Média' NOT NULL,
    start_date date,
    end_date date,
    progress integer DEFAULT 0 NOT NULL,
    wbs_code text,
    dependencies uuid[],
    parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, name),
    CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.change_history (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    change_description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_observations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content text,
    file_url text, -- URL para o arquivo no Supabase Storage
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ========= PART 2: FUNCTIONS AND TRIGGERS =========

-- 2.1 FUNÇÃO DE TRIGGER PARA ATUALIZAR 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.2 FUNÇÃO RPC PARA CRIAÇÃO DE TAREFAS COM ID SEQUENCIAL
CREATE OR REPLACE FUNCTION public.create_task_with_sequential_id(
    p_project_id uuid,
    p_name text,
    p_description text DEFAULT NULL,
    p_assignee_id uuid DEFAULT NULL,
    p_status_id uuid DEFAULT NULL,
    p_priority task_priority DEFAULT 'Média',
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_progress integer DEFAULT 0,
    p_parent_id uuid DEFAULT NULL,
    p_dependencies uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS tasks AS $$
DECLARE
    new_wbs_code text;
    task_count integer;
    new_task tasks;
BEGIN
    SELECT COUNT(*) + 1 INTO task_count FROM public.tasks WHERE project_id = p_project_id;
    new_wbs_code := 'TSK-' || lpad(task_count::text, 4, '0');

    INSERT INTO public.tasks (
        project_id, name, description, assignee_id, status_id, priority,
        start_date, end_date, progress, parent_id, dependencies, wbs_code
    )
    VALUES (
        p_project_id, p_name, p_description, p_assignee_id, p_status_id, p_priority,
        p_start_date, p_end_date, p_progress, p_parent_id, p_dependencies, new_wbs_code
    )
    RETURNING * INTO new_task;

    RETURN new_task;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY INVOKER;


-- ========= PART 3: ROW LEVEL SECURITY (RLS) =========

-- 3.1 LIMPEZA COMPLETA DE TODAS AS POLÍTICAS POSSÍVEIS (IDEMPOTENTE)
DROP POLICY IF EXISTS "Allow users to manage their own data" ON public.users;
DROP POLICY IF EXISTS "Allow admins to manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow read access to project members and admins" ON public.projects;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.projects;
DROP POLICY IF EXISTS "Allow read access to fellow project members and admins" ON public.collaborators;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.collaborators;
DROP POLICY IF EXISTS "Allow full access to project members and admins" ON public.tasks;
DROP POLICY IF EXISTS "Allow full access based on task visibility" ON public.task_observations;
DROP POLICY IF EXISTS "Allow delete only for owners or admins" ON public.task_observations;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.task_statuses;
DROP POLICY IF EXISTS "Allow management by admins and managers" ON public.task_statuses;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Allow management by admins and managers" ON public.tags;


-- 3.2 FUNÇÕES AUXILIARES DE RLS (ARQUITETURA FINAL E NÃO-RECURSIVA)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_projects()
RETURNS uuid[] AS $$
DECLARE
  project_ids uuid[];
BEGIN
  SELECT array_agg(project_id) INTO project_ids FROM public.collaborators WHERE user_id = auth.uid();
  RETURN project_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3.3 RECRIAR POLÍTICAS DE RLS
-- === Users (CRITICAL FOR AUTHENTICATION) ===
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own data" ON public.users
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Allow admins to manage all users" ON public.users
  FOR ALL USING (public.get_my_role() = 'Admin');

-- === Projects ===
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to project members and admins" ON public.projects
  FOR SELECT USING (id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow full access for admins" ON public.projects
  FOR ALL USING (public.get_my_role() = 'Admin');

-- === Collaborators ===
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to fellow project members and admins" ON public.collaborators
  FOR SELECT USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow full access for admins" ON public.collaborators
  FOR ALL USING (public.get_my_role() = 'Admin');

-- === Tasks ===
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to project members and admins" ON public.tasks
  FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');

-- === Task Observations ===
ALTER TABLE public.task_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on task visibility" ON public.task_observations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id)
  );
CREATE POLICY "Allow delete only for owners or admins" ON public.task_observations
  FOR DELETE USING (user_id = auth.uid() OR public.get_my_role() = 'Admin');
  
-- === Task Statuses (CORREÇÃO) ===
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.task_statuses
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow management by admins and managers" ON public.task_statuses
  FOR ALL USING (public.get_my_role() IN ('Admin', 'Gerente'));
  
-- === Tags (CORREÇÃO) ===
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.tags
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow management by admins and managers" ON public.tags
  FOR ALL USING (public.get_my_role() IN ('Admin', 'Gerente'));


-- ========= PART 4: SEED DATA (IDEMPOTENT) =========

DO $$
DECLARE
    -- UUIDs dos usuários criados no painel de autenticação:
    admin_user_id  uuid := '5a18de86-1c6d-4120-bd94-e61544d811b7';
    gp_user_id     uuid := 'a25b2ad6-1bf3-404a-a127-9ec841bf44b3';
    member_user_id uuid := 'c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a';

    -- IDs para entidades
    project_alpha_id uuid;
    project_beta_id uuid;
    status_todo_id uuid;
    status_inprogress_id uuid;
    status_done_id uuid;
    tag_frontend_id uuid;
    tag_backend_id uuid;
    tag_marketing_id uuid;
    task_planejamento_id uuid;
    task_design_id uuid;
    task_backend_id uuid;

BEGIN
    -- 4.1 GARANTIR A EXISTÊNCIA DOS PERFIS DE USUÁRIO
    INSERT INTO public.users (id, name, email, role)
    VALUES
        (admin_user_id, 'Super Admin', 'admin@example.com', 'Admin'),
        (gp_user_id, 'Gerente de Projeto', 'gp@example.com', 'Gerente'),
        (member_user_id, 'Membro da Equipe', 'membro@example.com', 'Membro')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- 4.2 INSERIR STATUS DE TAREFAS
    INSERT INTO public.task_statuses (name, color, display_order) VALUES ('A Fazer', '#808080', 0) ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.task_statuses (name, color, display_order) VALUES ('Em Progresso', '#3b82f6', 1) ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.task_statuses (name, color, display_order) VALUES ('Feito', '#22c55e', 2) ON CONFLICT (name) DO NOTHING;
    
    -- 4.3 INSERIR TAGS
    INSERT INTO public.tags (name, color) VALUES ('Frontend', '#3b82f6') ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.tags (name, color) VALUES ('Backend', '#10b981') ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.tags (name, color) VALUES ('Marketing', '#f97316') ON CONFLICT (name) DO NOTHING;

    -- 4.4 INSERIR PROJETOS
    INSERT INTO public.projects (name, description, budget, start_date, end_date) VALUES ('Projeto Alpha', 'Desenvolvimento do novo app mobile.', 50000, '2024-08-01', '2024-10-31') ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.projects (name, description, budget, start_date, end_date) VALUES ('Projeto Beta', 'Campanha de lançamento para o Q4.', 75000, '2024-09-01', '2024-11-30') ON CONFLICT (name) DO NOTHING;
    
    -- Capturar IDs para uso futuro (garantido que existam)
    SELECT id INTO project_alpha_id FROM public.projects WHERE name = 'Projeto Alpha';
    SELECT id INTO project_beta_id FROM public.projects WHERE name = 'Projeto Beta';
    
    -- 4.5 INSERIR COLABORADORES
    IF project_alpha_id IS NOT NULL AND project_beta_id IS NOT NULL THEN
        INSERT INTO public.collaborators (project_id, user_id, role) VALUES
            (project_alpha_id, gp_user_id, 'Gerente'),
            (project_alpha_id, member_user_id, 'Membro'),
            (project_beta_id, admin_user_id, 'Gerente')
        ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;

    -- 4.6 INSERIR TAREFAS
    SELECT id INTO status_todo_id FROM public.task_statuses WHERE name = 'A Fazer';
    SELECT id INTO status_inprogress_id FROM public.task_statuses WHERE name = 'Em Progresso';
    
    IF project_alpha_id IS NOT NULL AND status_inprogress_id IS NOT NULL THEN
        INSERT INTO public.tasks (project_id, name, assignee_id, status_id, priority, start_date, end_date, progress, wbs_code)
        VALUES (project_alpha_id, 'Planejamento e Design', gp_user_id, status_inprogress_id, 'Alta', '2024-08-01', '2024-08-10', 50, 'TSK-0001')
        ON CONFLICT (project_id, name) DO NOTHING;
    END IF;
    
    SELECT id INTO task_planejamento_id FROM public.tasks WHERE project_id = project_alpha_id AND name = 'Planejamento e Design';
    SELECT id INTO status_done_id FROM public.task_statuses WHERE name = 'Feito';

    IF task_planejamento_id IS NOT NULL AND status_done_id IS NOT NULL THEN
        INSERT INTO public.tasks (project_id, name, parent_id, assignee_id, status_id, priority, start_date, end_date, progress, wbs_code)
        VALUES (project_alpha_id, 'Design da Interface', task_planejamento_id, member_user_id, status_done_id, 'Média', '2024-08-05', '2024-08-10', 100, 'TSK-0002')
        ON CONFLICT (project_id, name) DO NOTHING;
    END IF;

    IF project_alpha_id IS NOT NULL AND status_todo_id IS NOT NULL THEN
        INSERT INTO public.tasks (project_id, name, assignee_id, status_id, priority, start_date, end_date, progress, wbs_code)
        VALUES (project_alpha_id, 'Desenvolvimento Backend', gp_user_id, status_todo_id, 'Alta', '2024-08-11', '2024-08-25', 0, 'TSK-0003')
        ON CONFLICT (project_id, name) DO NOTHING;
    END IF;

    -- 4.7 ASSOCIAR TAGS ÀS TAREFAS
    SELECT id INTO task_design_id FROM public.tasks WHERE name = 'Design da Interface';
    SELECT id INTO task_backend_id FROM public.tasks WHERE name = 'Desenvolvimento Backend';
    SELECT id INTO tag_frontend_id FROM public.tags WHERE name = 'Frontend';
    SELECT id INTO tag_backend_id FROM public.tags WHERE name = 'Backend';
    
    IF task_design_id IS NOT NULL AND tag_frontend_id IS NOT NULL THEN
        INSERT INTO public.task_tags (task_id, tag_id) VALUES (task_design_id, tag_frontend_id) ON CONFLICT DO NOTHING;
    END IF;
    IF task_backend_id IS NOT NULL AND tag_backend_id IS NOT NULL THEN
        INSERT INTO public.task_tags (task_id, tag_id) VALUES (task_backend_id, tag_backend_id) ON CONFLICT DO NOTHING;
    END IF;

END $$;
