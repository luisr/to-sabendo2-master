-- =============================================================================
--  SETUP CONSOLIDADO E DEFINITIVO DO BANCO DE DADOS (V21.0)
--  - Adiciona funcionalidade de Linha de Base (Baselines)
--  - Adiciona função para Análise de Caminho Crítico
-- =============================================================================

-- ========= PART 1: SCHEMA (TIPOS, TABELAS) =========

DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('Baixa', 'Média', 'Alta'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.collaborator_role AS ENUM ('Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, avatar_url TEXT, role TEXT DEFAULT 'Colaborador'
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE, description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.collaborators (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role collaborator_role NOT NULL DEFAULT 'Membro',
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_statuses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE, color text DEFAULT '#808080',
    display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, task_serial_id SERIAL,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL, description text,
    assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    priority task_priority DEFAULT 'Média' NOT NULL, start_date date, end_date date,
    progress integer DEFAULT 0 NOT NULL, wbs_code text, dependencies uuid[],
    parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb, created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Tabela: project_baselines (RESTAURADA)
CREATE TABLE IF NOT EXISTS public.project_baselines (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Tabela: baseline_tasks (RESTAURADA)
CREATE TABLE IF NOT EXISTS public.baseline_tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    baseline_id uuid NOT NULL REFERENCES public.project_baselines(id) ON DELETE CASCADE,
    original_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    name text, start_date date, end_date date
);

-- ... (demais tabelas como task_observations, task_history)

-- ========= PART 2: FUNÇÕES E TRIGGERS =========
-- (handle_new_user, update_dependent_tasks, etc. permanecem os mesmos)

-- ========= PART 3: FUNÇÕES RPC (Acesso a Dados) =========

-- Adiciona a função para cálculo do Caminho Crítico
DROP FUNCTION IF EXISTS public.get_critical_path(uuid);
CREATE OR REPLACE FUNCTION public.get_critical_path(p_project_id uuid)
RETURNS TABLE (task_id uuid, path uuid[], duration numeric) AS $$
DECLARE
    final_tasks uuid[];
BEGIN
    -- Identifica as tarefas finais (que não são dependência de nenhuma outra)
    SELECT ARRAY(
        SELECT t.id FROM public.tasks t
        WHERE t.project_id = p_project_id AND NOT EXISTS (
            SELECT 1 FROM public.tasks dep WHERE t.id = ANY(dep.dependencies) AND dep.project_id = p_project_id
        )
    ) INTO final_tasks;

    -- Usa CTEs recursivas para encontrar o caminho mais longo até cada tarefa final
    RETURN QUERY
    WITH RECURSIVE task_paths AS (
        -- Nós iniciais (tarefas sem dependências)
        SELECT 
            t.id as task_id,
            ARRAY[t.id] as path,
            COALESCE(t.end_date - t.start_date, 1) as duration
        FROM public.tasks t
        WHERE t.project_id = p_project_id AND (t.dependencies IS NULL OR cardinality(t.dependencies) = 0)

        UNION ALL

        -- Passos recursivos
        SELECT
            t.id,
            tp.path || t.id,
            tp.duration + COALESCE(t.end_date - t.start_date, 1)
        FROM public.tasks t
        JOIN task_paths tp ON t.parent_id = tp.task_id OR EXISTS (
            SELECT 1 FROM unnest(t.dependencies) dep_id WHERE dep_id = tp.task_id
        )
        WHERE t.project_id = p_project_id
    )
    -- Seleciona o caminho mais longo que termina em uma das tarefas finais
    SELECT * FROM task_paths
    WHERE task_id = ANY(final_tasks)
    ORDER BY duration DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- (Demais funções RPC como get_tasks_for_project permanecem as mesmas)

-- ========= PART 4: POLÍTICAS DE SEGURANÇA (RLS) =========
-- (As políticas existentes permanecem)

ALTER TABLE public.project_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to manage baselines" ON public.project_baselines
    FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');

CREATE POLICY "Allow members to view baseline tasks" ON public.baseline_tasks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.project_baselines pb
        WHERE pb.id = baseline_tasks.baseline_id AND (pb.project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin')
    ));

SELECT 'SETUP CONSOLIDADO (V21.0) - LINHA DE BASE E CAMINHO CRÍTICO - APLICADO COM SUCESSO!';
