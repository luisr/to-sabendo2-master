-- =============================================================================
--  MIGRAÇÃO DE CORREÇÃO DEFINITIVA DA ARQUITETURA DE RLS (V5)
--  Este script limpa TODAS as políticas, recria a arquitetura de segurança
--  e adiciona as funções RPC necessárias para buscar tarefas de forma eficiente.
-- =============================================================================

-- ========= PART 1: LIMPEZA COMPLETA DE TODAS AS POLÍTICAS (IDEMPOTENTE) =========
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

-- ========= PART 2: FUNÇÕES AUXILIARES E RPC (ARQUITETURA FINAL) =========

-- **CORREÇÃO**: Dropar as funções RPC antes de recriá-las para permitir a mudança de assinatura.
DROP FUNCTION IF EXISTS public.get_tasks_for_project(uuid);
DROP FUNCTION IF EXISTS public.get_all_user_tasks();

-- Função para obter o role do usuário. SECURITY DEFINER é a chave para quebrar o ciclo de recursão.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função para obter os projetos do usuário. SECURITY DEFINER é a chave para quebrar o ciclo de recursão.
CREATE OR REPLACE FUNCTION public.get_my_projects()
RETURNS uuid[] AS $$
DECLARE
  project_ids uuid[];
BEGIN
  SELECT array_agg(project_id) INTO project_ids FROM public.collaborators WHERE user_id = auth.uid();
  RETURN project_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- **FUNÇÃO RPC PARA VISÃO DE PROJETO ÚNICO**: Busca tarefas com todos os dados relacionados (JOINs).
CREATE OR REPLACE FUNCTION public.get_tasks_for_project(p_project_id uuid)
RETURNS TABLE (
    id uuid, name text, description text, assignee_id uuid, status_id uuid, priority text, start_date date,
    end_date date, progress integer, wbs_code text, dependencies uuid[], parent_id uuid, created_at timestamptz,
    project_id uuid, project_name text, assignee_name text, status_name text, status_color text, tags json
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, t.name, t.description, t.assignee_id, t.status_id, t.priority::text, t.start_date,
        t.end_date, t.progress, t.wbs_code, t.dependencies, t.parent_id, t.created_at,
        t.project_id, p.name as project_name, u.name as assignee_name, ts.name as status_name, ts.color as status_color,
        (SELECT json_agg(tags.*) FROM public.task_tags JOIN public.tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = t.id) as tags
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.users u ON t.assignee_id = u.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- **FUNÇÃO RPC PARA VISÃO CONSOLIDADA**: Busca todas as tarefas visíveis pelo usuário.
CREATE OR REPLACE FUNCTION public.get_all_user_tasks()
RETURNS TABLE (
    id uuid, name text, description text, assignee_id uuid, status_id uuid, priority text, start_date date,
    end_date date, progress integer, wbs_code text, dependencies uuid[], parent_id uuid, created_at timestamptz,
    project_id uuid, project_name text, assignee_name text, status_name text, status_color text, tags json
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, t.name, t.description, t.assignee_id, t.status_id, t.priority::text, t.start_date,
        t.end_date, t.progress, t.wbs_code, t.dependencies, t.parent_id, t.created_at,
        t.project_id, p.name as project_name, u.name as assignee_name, ts.name as status_name, ts.color as status_color,
        (SELECT json_agg(tags.*) FROM public.task_tags JOIN public.tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = t.id) as tags
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.users u ON t.assignee_id = u.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin';
END;
$$ LANGUAGE plpgsql STABLE;


-- ========= PART 3: RECRIAR TODAS AS POLÍTICAS DE RLS CORRETAMENTE =========

-- === Users ===
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own data" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Allow admins to manage all users" ON public.users FOR ALL USING (public.get_my_role() = 'Admin');

-- === Projects ===
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to project members and admins" ON public.projects FOR SELECT USING (id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow full access for admins" ON public.projects FOR ALL USING (public.get_my_role() = 'Admin');

-- === Collaborators ===
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to fellow project members and admins" ON public.collaborators FOR SELECT USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow full access for admins" ON public.collaborators FOR ALL USING (public.get_my_role() = 'Admin');

-- === Tasks ===
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to project members and admins" ON public.tasks FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');

-- === Task Observations ===
ALTER TABLE public.task_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on task visibility" ON public.task_observations FOR ALL USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id));
CREATE POLICY "Allow delete only for owners or admins" ON public.task_observations FOR DELETE USING (user_id = auth.uid() OR public.get_my_role() = 'Admin');
  
-- === Task Statuses ===
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.task_statuses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow management by admins and managers" ON public.task_statuses FOR ALL USING (public.get_my_role() IN ('Admin', 'Gerente'));
  
-- === Tags ===
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow management by admins and managers" ON public.tags FOR ALL USING (public.get_my_role() IN ('Admin', 'Gerente'));

SELECT 'MIGRATION 001_fix_rls_definitivo.sql (V5) APPLIED SUCCESSFULLY!';