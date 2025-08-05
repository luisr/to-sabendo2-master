-- =============================================================================
--  SETUP CONSOLIDADO E DEFINITIVO DO BANCO DE DADOS (V21.0 - RETORNO À ARQUITETURA ESTÁVEL)
-- =============================================================================

-- ========= PART 1: SCHEMA E FUNÇÕES AUXILIARES =========
-- Schema (sem alterações)
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('Baixa', 'Média', 'Alta'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.collaborator_role AS ENUM ('Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE TABLE IF NOT EXISTS public.profiles ( id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name TEXT, avatar_url TEXT, role TEXT DEFAULT 'Colaborador' );
CREATE TABLE IF NOT EXISTS public.projects ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, name text NOT NULL UNIQUE, description text, created_at timestamp with time zone DEFAULT now() NOT NULL );
CREATE TABLE IF NOT EXISTS public.collaborators ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, role collaborator_role NOT NULL DEFAULT 'Membro', UNIQUE(project_id, user_id) );
CREATE TABLE IF NOT EXISTS public.task_statuses ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, name text NOT NULL UNIQUE, color text DEFAULT '#808080', display_order integer NOT NULL DEFAULT 0 );
CREATE TABLE IF NOT EXISTS public.tags ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, name text NOT NULL UNIQUE );
CREATE TABLE IF NOT EXISTS public.tasks ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, task_serial_id SERIAL, project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, name text NOT NULL, description text, assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL, priority task_priority DEFAULT 'Média' NOT NULL, start_date date, end_date date, progress integer DEFAULT 0 NOT NULL, wbs_code text, dependencies uuid[], parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL, custom_fields jsonb DEFAULT '{}'::jsonb, created_at timestamp with time zone DEFAULT now() NOT NULL, CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100) );
CREATE TABLE IF NOT EXISTS public.project_baselines ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, name text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, created_by uuid NOT NULL REFERENCES public.profiles(id) );
CREATE TABLE IF NOT EXISTS public.baseline_tasks ( id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, baseline_id uuid NOT NULL REFERENCES public.project_baselines(id) ON DELETE CASCADE, original_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, start_date date NOT NULL, end_date date NOT NULL );
CREATE TABLE IF NOT EXISTS public.task_tags ( task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE, PRIMARY KEY (task_id, tag_id) );
CREATE TABLE IF NOT EXISTS public.task_observations ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, content text, file_url text, created_at timestamptz NOT NULL DEFAULT now(), user_name text, user_avatar_url text );
CREATE TABLE IF NOT EXISTS public.task_history ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id), changed_field TEXT NOT NULL, old_value TEXT, new_value TEXT, reason TEXT, changed_at TIMESTAMPTZ NOT NULL DEFAULT now() );

-- Funções Auxiliares (Arquitetura Correta)
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT AS $$ BEGIN RETURN (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1); END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_projects() RETURNS uuid[] AS $$
BEGIN
  -- Esta função é o coração da RLS. SECURITY DEFINER é a chave para quebrar a recursão.
  RETURN ARRAY(SELECT project_id FROM public.collaborators WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ========= PART 2: POLÍTICAS DE SEGURANÇA (RLS) =========
-- Habilitando RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_tasks ENABLE ROW LEVEL SECURITY;

-- LIMPEZA TOTAL das políticas para garantir um estado inicial limpo.
DROP POLICY IF EXISTS "Allow individual access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow members to manage their own collaboration entry" ON public.collaborators;
DROP POLICY IF EXISTS "Allow admin full access on collaborations" ON public.collaborators;
DROP POLICY IF EXISTS "Allow access to assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Allow admin full access" ON public.projects;
DROP POLICY IF EXISTS "Allow access to tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Allow admin full access on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow project members to manage baselines" ON public.project_baselines;
DROP POLICY IF EXISTS "Allow project members to manage baseline tasks" ON public.baseline_tasks;

-- POLÍTICAS NÃO-RECURSIVAS

-- PROFILES
CREATE POLICY "Allow individual access" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Allow authenticated users to read profiles" ON public.profiles FOR SELECT USING (true);

-- COLLABORATORS: Política ultra-simples. Não chama nenhuma função.
CREATE POLICY "Allow members to manage their own collaboration entry" ON public.collaborators FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow admin full access on collaborations" ON public.collaborators FOR ALL USING ((SELECT get_my_role()) = 'Admin');

-- PROJECTS: Usa a função segura get_my_projects
CREATE POLICY "Allow access to assigned projects" ON public.projects FOR ALL USING (id = ANY(get_my_projects()));
CREATE POLICY "Allow admin full access" ON public.projects FOR ALL USING ((SELECT get_my_role()) = 'Admin');

-- TASKS: Usa a função segura get_my_projects
CREATE POLICY "Allow access to tasks in assigned projects" ON public.tasks FOR ALL USING (project_id = ANY(get_my_projects()));
CREATE POLICY "Allow admin full access on tasks" ON public.tasks FOR ALL USING ((SELECT get_my_role()) = 'Admin');

-- TABELAS RELACIONADAS: Também usam a função segura get_my_projects
CREATE POLICY "Allow project members to manage baselines" ON public.project_baselines FOR ALL USING (project_id = ANY(get_my_projects()));
CREATE POLICY "Allow project members to manage baseline tasks" ON public.baseline_tasks FOR ALL USING (EXISTS (SELECT 1 FROM public.project_baselines b WHERE b.id = baseline_tasks.baseline_id AND b.project_id = ANY(get_my_projects())));

SELECT 'SETUP CONSOLIDADO E DEFINITIVO (V21.0) APLICADO COM SUCESSO!';
