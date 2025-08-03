-- =============================================================================
-- PROJETO: TO SABENDO
-- ARQUIVO ÚNICO DE SETUP COMPLETO (Schema + Funções + RLS) - TESTE DE DIAGNÓSTICO FINAL (TASKS)
-- =============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMs
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('Admin', 'Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('Baixa', 'Média', 'Alta', 'Urgente'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.collaborator_role AS ENUM ('Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.custom_column_type AS ENUM ('texto', 'numero', 'data', 'formula'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABELAS
CREATE TABLE IF NOT EXISTS public.users (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name text, email text UNIQUE, avatar text, role user_role NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS public.projects (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL UNIQUE, description text, budget numeric(12, 2) DEFAULT 0.00, start_date date, end_date date, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT budget_is_positive CHECK (budget >= 0));
CREATE TABLE IF NOT EXISTS public.collaborators (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, role collaborator_role NOT NULL DEFAULT 'Membro', created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, UNIQUE (project_id, user_id));
CREATE TABLE IF NOT EXISTS public.task_statuses (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL UNIQUE, color text DEFAULT '#808080', display_order int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.tags (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL UNIQUE, color text DEFAULT '#cccccc');
CREATE TABLE IF NOT EXISTS public.custom_columns (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, name text NOT NULL, type custom_column_type NOT NULL, display_order int DEFAULT 0, created_at timestamptz DEFAULT now() NOT NULL, UNIQUE (project_id, name));
CREATE TABLE IF NOT EXISTS public.tasks (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, name text NOT NULL, description text, assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL, status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL, priority task_priority DEFAULT 'Média' NOT NULL, start_date date, end_date date, progress int DEFAULT 0 NOT NULL, wbs_code text, dependencies uuid[], parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL, custom_fields jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, UNIQUE (project_id, name), CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100));
CREATE TABLE IF NOT EXISTS public.task_tags (task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE, PRIMARY KEY (task_id, tag_id));
CREATE TABLE IF NOT EXISTS public.change_history (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, change_description text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL);


-- 4. FUNÇÕES AUXILIARES (COM PROTEÇÃO ANTI-RECURSÃO)
CREATE OR REPLACE FUNCTION public.uid_safe() RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid; $$;
GRANT EXECUTE ON FUNCTION public.uid_safe() TO PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$ DECLARE is_admin_result boolean; BEGIN SET LOCAL row_security = off; is_admin_result := EXISTS (SELECT 1 FROM public.users WHERE id = public.uid_safe() AND role = 'Admin'); RESET row_security; RETURN is_admin_result; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid) RETURNS boolean AS $$ DECLARE is_member_result boolean; BEGIN SET LOCAL row_security = off; is_member_result := EXISTS (SELECT 1 FROM public.collaborators WHERE project_id = p_project_id AND user_id = public.uid_safe()); RESET row_security; RETURN is_member_result; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid) RETURNS boolean AS $$ DECLARE is_manager_result boolean; BEGIN SET LOCAL row_security = off; is_manager_result := EXISTS (SELECT 1 FROM public.collaborators WHERE project_id = p_project_id AND user_id = public.uid_safe() AND role = 'Gerente'); RESET row_security; RETURN is_manager_result; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.create_task_with_sequential_id(uuid,text,text,uuid,uuid,task_priority,date,date,integer,uuid,uuid[]);
CREATE OR REPLACE FUNCTION public.create_task_with_sequential_id(p_project_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority task_priority, p_start_date date, p_end_date date, p_progress int, p_parent_id uuid, p_dependencies uuid[]) RETURNS tasks AS $$ DECLARE task_count int; new_wbs_code text; new_task tasks; BEGIN SELECT COUNT(*) + 1 INTO task_count FROM public.tasks WHERE project_id = p_project_id; new_wbs_code := 'TSK-' || lpad(task_count::text, 4, '0'); INSERT INTO public.tasks (project_id, name, description, assignee_id, status_id, priority, start_date, end_date, progress, parent_id, dependencies, wbs_code) VALUES (p_project_id, p_name, p_description, p_assignee_id, p_status_id, p_priority, p_start_date, p_end_date, p_progress, p_parent_id, p_dependencies, new_wbs_code) RETURNING * INTO new_task; RETURN new_task; END; $$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.get_managed_projects(p_user_id uuid) RETURNS SETOF projects AS $$ BEGIN RETURN QUERY SELECT p.* FROM public.projects p JOIN public.collaborators c ON p.id = c.project_id WHERE c.user_id = p_user_id AND c.role = 'Gerente'; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_managed_projects(uuid) TO authenticated;

-- 5. ATIVAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

-- 6. REMOVER POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;
DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros do projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Qualquer autenticado vê tags" ON public.tags;
DROP POLICY IF EXISTS "Qualquer autenticado vê task_tags" ON public.task_tags;
DROP POLICY IF EXISTS "Membros veem colunas personalizadas" ON public.custom_columns;
DROP POLICY IF EXISTS "Membros veem histórico do projeto" ON public.change_history;

-- 7. POLÍTICAS SEGURAS

CREATE POLICY "Usuários podem ver seus próprios dados" ON public.users FOR ALL USING (public.uid_safe() = id);
CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Membros podem ver projetos" ON public.projects FOR SELECT USING (public.is_admin() OR public.is_project_member(id));
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects FOR ALL USING (public.is_admin() OR public.is_project_manager(id));

-- Política de diagnóstico para tasks
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));

CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = public.uid_safe()));
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = public.uid_safe() AND c2.role = 'Gerente'));
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Qualquer autenticado vê tags" ON public.tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Qualquer autenticado vê task_tags" ON public.task_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Membros veem histórico do projeto" ON public.change_history FOR SELECT USING (public.is_admin() OR public.is_project_member(project_id));
CREATE POLICY "Membros veem colunas personalizadas" ON public.custom_columns FOR SELECT USING (true);