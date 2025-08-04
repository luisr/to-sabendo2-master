-- =============================================================================
--  SETUP CONSOLIDADO E DEFINITIVO DO BANCO DE DADOS (V17)
--  Este script mestre executa todas as etapas para configurar o banco de dados
--  e o storage do zero, incorporando todas as correções.
-- =============================================================================

-- ========= PART 1: SCHEMA (TIPOS, TABELAS) =========

DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('Baixa', 'Média', 'Alta'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.collaborator_role AS ENUM ('Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'Colaborador'
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
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
    name text NOT NULL UNIQUE,
    color text DEFAULT '#808080',
    display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    priority task_priority DEFAULT 'Média' NOT NULL,
    start_date date,
    end_date date,
    progress integer DEFAULT 0 NOT NULL,
    wbs_code text,
    dependencies uuid[],
    parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.task_observations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text,
    file_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    user_name text,
    user_avatar_url text
);

-- ========= PART 2: TRIGGERS E FUNÇÕES DE SINCRONIZAÇÃO =========

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'Colaborador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========= PART 3: FUNÇÕES RPC (Acesso a Dados) =========

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_projects()
RETURNS uuid[] AS $$
BEGIN
  RETURN ARRAY(SELECT project_id FROM public.collaborators WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
        t.end_date, t.progress, t.wbs_code,
        COALESCE(t.dependencies, ARRAY[]::uuid[]),
        t.parent_id, t.created_at,
        t.project_id, p.name as project_name,
        u.name as assignee_name,
        ts.name as status_name, ts.color as status_color,
        COALESCE(
            (SELECT json_agg(tags.*) FROM public.task_tags JOIN public.tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = t.id),
            '[]'::json
        ) as tags
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.profiles u ON t.assignee_id = u.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.update_task_with_tags(
    p_task_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority text,
    p_progress integer, p_start_date text, p_end_date text, p_parent_id uuid, p_dependencies uuid[], p_tag_ids uuid[]
)
RETURNS void AS $$
BEGIN
    UPDATE public.tasks
    SET
        name = p_name, description = p_description, assignee_id = p_assignee_id, status_id = p_status_id,
        priority = p_priority::task_priority, progress = p_progress, start_date = p_start_date::date,
        end_date = p_end_date::date, parent_id = p_parent_id, dependencies = p_dependencies
    WHERE id = p_task_id;

    DELETE FROM public.task_tags WHERE task_id = p_task_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
        INSERT INTO public.task_tags (task_id, tag_id)
        SELECT p_task_id, unnest(p_tag_ids);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========= PART 4: POLÍTICAS DE SEGURANÇA (RLS) =========

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Apagar políticas antigas para um estado limpo
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access to project members and admins" ON public.projects;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.projects;
DROP POLICY IF EXISTS "Allow read/write to project members" ON public.collaborators;
DROP POLICY IF EXISTS "Allow admins full access" ON public.collaborators;
DROP POLICY IF EXISTS "Allow project members to manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow members to manage observations" ON public.task_observations;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.task_statuses;
DROP POLICY IF EXISTS "Allow admins to manage" ON public.task_statuses;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Allow admins to manage" ON public.tags;

-- Novas Políticas
CREATE POLICY "Allow authenticated users to read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow read access to project members and admins" ON public.projects FOR SELECT USING (id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow full access for admins" ON public.projects FOR ALL USING (public.get_my_role() = 'Admin');

CREATE POLICY "Allow read/write to project members" ON public.collaborators FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow admins full access" ON public.collaborators FOR ALL USING (public.get_my_role() = 'Admin');

CREATE POLICY "Allow project members to manage tasks" ON public.tasks FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');

CREATE POLICY "Allow members to manage observations" ON public.task_observations FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');

CREATE POLICY "Allow read access to all authenticated users" ON public.task_statuses FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage" ON public.task_statuses FOR ALL USING (public.get_my_role() = 'Admin');

CREATE POLICY "Allow read access to all authenticated users" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage" ON public.tags FOR ALL USING (public.get_my_role() = 'Admin');


-- ========= PART 5: POLÍTICAS DE STORAGE =========
CREATE OR REPLACE FUNCTION public.can_interact_with_task_file(p_file_path text)
RETURNS boolean AS $$
DECLARE
    v_task_id uuid;
    v_has_permission boolean;
BEGIN
    BEGIN
        v_task_id := (string_to_array(p_file_path, '/'))[3]::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    SELECT EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.collaborators c ON t.project_id = c.project_id
        WHERE t.id = v_task_id AND c.user_id = auth.uid()
    ) OR (get_my_role() = 'Admin')
    INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Allow project members to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow project members to upload files" ON storage.objects;

CREATE POLICY "Allow project members to view files" ON storage.objects FOR SELECT USING ( bucket_id = 'tosabendo2' AND public.can_interact_with_task_file(name) );
CREATE POLICY "Allow project members to upload files" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'tosabendo2' AND public.can_interact_with_task_file(name) );


-- ========= PART 6: DADOS INICIAIS (SEED) =========
DO $$
DECLARE
    admin_user_id  uuid := '5a18de86-1c6d-4120-bd94-e61544d811b7';
    gp_user_id     uuid := 'a25b2ad6-1bf3-404a-a127-9ec841bf44b3';
    member_user_id uuid := 'c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a';
BEGIN
    -- Sincronizar utilizadores existentes
    INSERT INTO public.profiles (id, name, avatar_url, role)
    SELECT id, raw_user_meta_data->>'name', raw_user_meta_data->>'avatar_url', COALESCE(raw_user_meta_data->>'role', 'Colaborador')
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;

    -- Garantir os roles corretos para os utilizadores do seed
    UPDATE public.profiles SET role = 'Admin' WHERE id = admin_user_id;
    UPDATE public.profiles SET role = 'Gerente' WHERE id = gp_user_id;
    UPDATE public.profiles SET role = 'Membro' WHERE id = member_user_id;
END $$;

SELECT 'SETUP CONSOLIDADO E DEFINITIVO (V17) APLICADO COM SUCESSO!';
