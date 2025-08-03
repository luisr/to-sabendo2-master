-- =============================================================================
--  FUNÇÕES DO BANCO DE DADOS - PROJETO "TO SABENDO"
--  Este arquivo contém todas as funções, triggers e helpers do banco de dados.
--  Execute após o schema.sql. Utiliza CREATE OR REPLACE para ser idempotente.
-- =============================================================================

-- 1. FUNÇÃO DE TRIGGER PARA ATUALIZAR 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNÇÕES AUXILIARES DE RLS (SECURITY DEFINER PARA EVITAR RECURSÃO)
-- is_admin() deve ser SECURITY DEFINER para evitar loop de RLS ao verificar o role do usuário
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nova função para obter o role do usuário autenticado de forma segura para RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result FROM public.users WHERE id = auth.uid();
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'Gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FUNÇÃO RPC PARA CRIAÇÃO DE TAREFAS COM ID SEQUENCIAL
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
