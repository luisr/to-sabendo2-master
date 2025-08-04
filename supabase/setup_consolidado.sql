-- =============================================================================
--  SETUP CONSOLIDADO E DEFINITIVO DO BANCO DE DADOS (V20.2)
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
    task_serial_id SERIAL,
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
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.tasks'::regclass AND attname = 'custom_fields') THEN
        ALTER TABLE public.tasks ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.tasks'::regclass AND attname = 'task_serial_id') THEN
        ALTER TABLE public.tasks ADD COLUMN task_serial_id SERIAL;
    END IF;
END;
$$;


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

CREATE TABLE IF NOT EXISTS public.task_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    changed_field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  
CREATE OR REPLACE FUNCTION update_dependent_tasks()
RETURNS TRIGGER AS $$
DECLARE
    dependency_task_id uuid;
    duration interval;
BEGIN
    IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
        FOR dependency_task_id IN
            SELECT id FROM public.tasks WHERE NEW.id = ANY(dependencies)
        LOOP
            SELECT (end_date - start_date) INTO duration FROM public.tasks WHERE id = dependency_task_id;
            
            UPDATE public.tasks
            SET 
                start_date = NEW.end_date + interval '1 day',
                end_date = NEW.end_date + interval '1 day' + duration
            WHERE id = dependency_task_id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_task_update ON public.tasks;
CREATE TRIGGER after_task_update
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_dependent_tasks();

-- ========= PART 3: FUNÇÕES RPC (Acesso a Dados) =========

DROP FUNCTION IF EXISTS public.get_all_users();
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (id uuid, name text, avatar_url text, role text) AS $$
BEGIN
    RETURN QUERY SELECT p.id, COALESCE(p.name, u.email, 'N/A'), p.avatar_url, p.role 
                 FROM public.profiles p
                 LEFT JOIN auth.users u ON p.id = u.id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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

DROP FUNCTION IF EXISTS public.get_tasks_for_project(uuid);
CREATE OR REPLACE FUNCTION public.get_tasks_for_project(p_project_id uuid)
RETURNS TABLE (
    id uuid, formatted_id text, name text, description text, assignee_id uuid, status_id uuid, priority text, start_date date,
    end_date date, progress integer, wbs_code text, dependencies uuid[], parent_id uuid, created_at timestamptz,
    project_id uuid, project_name text, assignee_name text, status_name text, status_color text, tags json, custom_fields jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, 
        'TSK-' || lpad(t.task_serial_id::text, 4, '0') as formatted_id,
        t.name, t.description, t.assignee_id, t.status_id, t.priority::text, t.start_date,
        t.end_date, t.progress, t.wbs_code,
        COALESCE(t.dependencies, ARRAY[]::uuid[]),
        t.parent_id, t.created_at,
        t.project_id, p.name as project_name,
        COALESCE(u.name, auth_user.email, 'N/A') as assignee_name,
        ts.name as status_name, ts.color as status_color,
        COALESCE(
            (SELECT json_agg(tags.*) FROM public.task_tags JOIN public.tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = t.id),
            '[]'::json
        ) as tags,
        t.custom_fields
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.profiles u ON t.assignee_id = u.id
    LEFT JOIN auth.users auth_user ON u.id = auth_user.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.get_all_user_tasks();
CREATE OR REPLACE FUNCTION public.get_all_user_tasks()
RETURNS TABLE (
    id uuid, formatted_id text, name text, description text, assignee_id uuid, status_id uuid, priority text, start_date date,
    end_date date, progress integer, wbs_code text, dependencies uuid[], parent_id uuid, created_at timestamptz,
    project_id uuid, project_name text, assignee_name text, status_name text, status_color text, tags json, custom_fields jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, 
        'TSK-' || lpad(t.task_serial_id::text, 4, '0') as formatted_id,
        t.name, t.description, t.assignee_id, t.status_id, t.priority::text, t.start_date,
        t.end_date, t.progress, t.wbs_code,
        COALESCE(t.dependencies, ARRAY[]::uuid[]),
        t.parent_id, t.created_at,
        t.project_id, p.name as project_name,
        COALESCE(u.name, auth_user.email, 'N/A') as assignee_name,
        ts.name as status_name, ts.color as status_color,
        COALESCE(
            (SELECT json_agg(tags.*) FROM public.task_tags JOIN public.tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = t.id),
            '[]'::json
        ) as tags,
        t.custom_fields
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.profiles u ON t.assignee_id = u.id
    LEFT JOIN auth.users auth_user ON u.id = auth_user.id
    LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.insert_task_with_tags(uuid,text,text,uuid,uuid,text,integer,text,text,uuid,uuid[],uuid[],jsonb);
CREATE OR REPLACE FUNCTION public.insert_task_with_tags(
    p_project_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority text, 
    p_progress integer, p_start_date text, p_end_date text, p_parent_id uuid, p_dependencies uuid[], p_tag_ids uuid[], p_custom_fields jsonb
)
RETURNS uuid AS $$
DECLARE
    new_task_id uuid;
BEGIN
    INSERT INTO public.tasks (
        project_id, name, description, assignee_id, status_id, priority, progress, start_date, end_date, parent_id, dependencies, custom_fields
    ) VALUES (
        p_project_id, p_name, p_description, p_assignee_id, p_status_id, p_priority::task_priority, p_progress, 
        p_start_date::date, p_end_date::date, p_parent_id, p_dependencies, p_custom_fields
    ) RETURNING id INTO new_task_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
        INSERT INTO public.task_tags (task_id, tag_id)
        SELECT new_task_id, unnest(p_tag_ids);
    END IF;

    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.update_task_with_tags(uuid,text,text,uuid,uuid,text,integer,text,text,uuid,uuid[],uuid[],jsonb);
CREATE OR REPLACE FUNCTION public.update_task_with_tags(
    p_task_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority text,
    p_progress integer, p_start_date text, p_end_date text, p_parent_id uuid, p_dependencies uuid[], p_tag_ids uuid[], p_custom_fields jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE public.tasks
    SET
        name = p_name, description = p_description, assignee_id = p_assignee_id, status_id = p_status_id,
        priority = p_priority::task_priority, progress = p_progress, start_date = p_start_date::date,
        end_date = p_end_date::date, parent_id = p_parent_id, dependencies = p_dependencies, custom_fields = p_custom_fields
    WHERE id = p_task_id;

    DELETE FROM public.task_tags WHERE task_id = p_task_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
        INSERT INTO public.task_tags (task_id, tag_id)
        SELECT p_task_id, unnest(p_tag_ids);
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.update_task_with_history(uuid,text,text,uuid,uuid,text,integer,text,text,uuid,uuid[],uuid[],jsonb,text);
CREATE OR REPLACE FUNCTION public.update_task_with_history(
    p_task_id uuid, p_name text, p_description text, p_assignee_id uuid, p_status_id uuid, p_priority text,
    p_progress integer, p_start_date text, p_end_date text, p_parent_id uuid, p_dependencies uuid[], p_tag_ids uuid[],
    p_custom_fields jsonb, p_reason text
)
RETURNS void AS $$
DECLARE
    old_start_date date;
    old_end_date date;
BEGIN
    SELECT start_date, end_date INTO old_start_date, old_end_date FROM public.tasks WHERE id = p_task_id;

    PERFORM public.update_task_with_tags(p_task_id, p_name, p_description, p_assignee_id, p_status_id, p_priority, p_progress, p_start_date, p_end_date, p_parent_id, p_dependencies, p_tag_ids, p_custom_fields);

    IF old_start_date IS DISTINCT FROM p_start_date::date THEN
        INSERT INTO public.task_history (task_id, user_id, changed_field, old_value, new_value, reason)
        VALUES (p_task_id, auth.uid(), 'start_date', old_start_date::text, p_start_date, p_reason);
    END IF;

    IF old_end_date IS DISTINCT FROM p_end_date::date THEN
        INSERT INTO public.task_history (task_id, user_id, changed_field, old_value, new_value, reason)
        VALUES (p_task_id, auth.uid(), 'end_date', old_end_date::text, p_end_date, p_reason);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========= PART 4: POLÍTICAS DE SEGURANÇA (RLS) =========

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access to project members and admins" ON public.projects;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.projects;
DROP POLICY IF EXISTS "Allow read/write to project members" ON public.collaborators;
DROP POLICY IF EXISTS "Allow admins full access" ON public.collaborators;
DROP POLICY IF EXISTS "Allow project members to manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow members to manage task history" ON public.task_history;
DROP POLICY IF EXISTS "Allow members to manage observations" ON public.task_observations;
DROP POLICY IF EXISTS "Allow members to manage task tags" ON public.task_tags;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.task_statuses;
DROP POLICY IF EXISTS "Allow admins to manage" ON public.task_statuses;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Allow admins to manage" ON public.tags;

CREATE POLICY "Allow authenticated users to read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow read access to project members and admins" ON public.projects FOR SELECT USING (id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow full access for admins" ON public.projects FOR ALL USING (public.get_my_role() = 'Admin');
CREATE POLICY "Allow read/write to project members" ON public.collaborators FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow admins full access" ON public.collaborators FOR ALL USING (public.get_my_role() = 'Admin');
CREATE POLICY "Allow project members to manage tasks" ON public.tasks FOR ALL USING (project_id = ANY(public.get_my_projects()) OR public.get_my_role() = 'Admin');
CREATE POLICY "Allow members to manage task tags" ON public.task_tags FOR ALL USING (get_my_role() = 'Admin' OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_tags.task_id AND t.project_id = ANY(public.get_my_projects())));
CREATE POLICY "Allow members to manage task history" ON public.task_history FOR ALL USING (get_my_role() = 'Admin' OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_history.task_id AND t.project_id = ANY(public.get_my_projects())));
CREATE POLICY "Allow members to manage observations" ON public.task_observations FOR ALL USING ((get_my_role() = 'Admin') OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_observations.task_id AND t.project_id = ANY(public.get_my_projects())));
CREATE POLICY "Allow read access to all authenticated users" ON public.task_statuses FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage" ON public.task_statuses FOR ALL USING (public.get_my_role() IN ('Admin', 'Gerente'));
CREATE POLICY "Allow read access to all authenticated users" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage" ON public.tags FOR ALL USING (public.get_my_role() IN ('Admin', 'Gerente'));

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
    INSERT INTO public.profiles (id, name, avatar_url, role)
    SELECT id, raw_user_meta_data->>'name', raw_user_meta_data->>'avatar_url', COALESCE(raw_user_meta_data->>'role', 'Colaborador')
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url;

    UPDATE public.profiles SET role = 'Admin' WHERE id = admin_user_id;
    UPDATE public.profiles SET role = 'Gerente' WHERE id = gp_user_id;
    UPDATE public.profiles SET role = 'Colaborador' WHERE id = member_user_id;
END $$;

SELECT 'SETUP CONSOLIDADO E DEFINITIVO (V20.2) APLICADO COM SUCESSO!';
