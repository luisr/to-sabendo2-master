-- =============================================================================
-- SCRIPT CONSOLIDADO: FUNÇÕES RPC DO GERENTE
-- Este script remove e recria as funções RPC para o dashboard e visualizações do gerente.
-- Inclui desativação local de RLS dentro das funções de agregação para garantir visibilidade de dados.
-- =============================================================================

-- Remove as funções existentes
DROP FUNCTION IF EXISTS public.get_manager_kpis();
DROP FUNCTION IF EXISTS public.get_manager_recent_projects();
DROP FUNCTION IF EXISTS public.get_manager_recent_tasks();
DROP FUNCTION IF EXISTS public.get_manager_tasks_by_status();

-- =============================================================================
-- Função 1: Retorna KPIs agregados dos projetos gerenciados pelo usuário.
-- get_manager_kpis()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_kpis()
RETURNS json AS $$
DECLARE
    managed_project_ids uuid[];
    total_budget numeric;
    overall_progress numeric;
    total_tasks bigint;
    completed_tasks bigint;
    tasks_at_risk bigint;
    done_status_id uuid;
BEGIN
    SET LOCAL row_security = off; -- Desativa RLS localmente para garantir visibilidade completa das tabelas usadas na agregação

    -- Obter os IDs dos projetos onde o usuário é Gerente
    -- Assumimos que a RLS na tabela collaborators permite que o usuário veja suas próprias entradas
    SELECT ARRAY(
        SELECT project_id
        FROM public.collaborators
        WHERE user_id = auth.uid() AND role = 'Gerente'
    ) INTO managed_project_ids;

    RAISE NOTICE 'Managed Project IDs: %', managed_project_ids; -- Debugging

    -- Se não gerencia nenhum projeto, retorna zero.
    IF managed_project_ids IS NULL OR array_length(managed_project_ids, 1) = 0 THEN
        RAISE NOTICE 'No managed projects found.'; -- Debugging
        RETURN json_build_object(
            'total_projects', 0, 'total_budget', 0, 'overall_progress', 0,
            'total_tasks', 0, 'completed_tasks', 0, 'tasks_at_risk', 0
        );
    END IF;

    -- Obter o ID do status "Feito"
    SELECT id INTO done_status_id FROM public.task_statuses WHERE name = 'Feito' LIMIT 1;

    RAISE NOTICE 'Calculating total budget...'; -- Debugging
    SELECT
        COALESCE(SUM(budget), 0)
    INTO
        total_budget
    FROM public.projects
    WHERE id = ANY(managed_project_ids);

    RAISE NOTICE 'Calculating task counts...'; -- Debugging
    SELECT
        COUNT(*),
        COUNT(CASE WHEN status_id = done_status_id THEN 1 END),
        COUNT(CASE WHEN end_date < CURRENT_DATE AND status_id != done_status_id THEN 1 END)
    INTO
        total_tasks,
        completed_tasks,
        tasks_at_risk
    FROM public.tasks
    WHERE project_id = ANY(managed_project_ids);

    RAISE NOTICE 'Calculating overall progress...'; -- Debugging
    SELECT COALESCE(AVG(progress), 0)
    INTO overall_progress
    FROM public.tasks
    WHERE project_id = ANY(managed_project_ids);

    RETURN json_build_object(
        'total_projects', array_length(managed_project_ids, 1),
        'total_budget', total_budget,
        'overall_progress', overall_progress,
        'total_tasks', total_tasks,
        'completed_tasks', completed_tasks,
        'tasks_at_risk', tasks_at_risk
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 3: Retorna os projetos atualizados mais recentemente dos projetos gerenciados.
-- get_manager_recent_projects() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_recent_projects()
RETURNS SETOF projects AS $$
BEGIN
    -- Desativa RLS localmente
    SET LOCAL row_security = off;

    -- Adicionado para depuração
    RAISE NOTICE 'Resultado get_manager_recent_projects: %', ARRAY(
        SELECT p FROM public.projects p
        JOIN public.collaborators c ON p.id = c.project_id
        WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
        ORDER BY p.updated_at DESC
        LIMIT 5
    );

    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
    ORDER BY p.updated_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =============================================================================
-- Função 2: Retorna os projetos gerenciados pelo usuário.
-- get_managed_projects() - Replicando do use-projects para consistência
-- =============================================================================
-- NOTE: Esta função pode não ser estritamente usada pelo dashboard do gerente
-- mas é útil para outras partes do frontend que listam projetos gerenciados.
-- Mantemos a desativação de RLS para garantir que ela veja todos os projetos
-- onde o usuário é Gerente, independentemente da RLS da tabela projects.
CREATE OR REPLACE FUNCTION public.get_managed_projects(p_user_id uuid)
RETURNS SETOF projects AS $$
BEGIN
    SET LOCAL row_security = off; -- Desativa RLS localmente

    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = p_user_id AND c.role = 'Gerente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 3: Retorna os projetos atualizados mais recentemente dos projetos gerenciados.
-- get_manager_recent_projects() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_recent_projects()
RETURNS SETOF projects AS $$
BEGIN
    SET LOCAL row_security = off; -- Desativa RLS localmente

    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
    ORDER BY p.updated_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 4: Retorna as tarefas atualizadas mais recentemente dos projetos gerenciados.
-- get_manager_recent_tasks() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_recent_tasks()
RETURNS SETOF tasks AS $$
BEGIN
    SET LOCAL row_security = off; -- Desativa RLS localmente

    RETURN QUERY
    SELECT t.*
    FROM public.tasks t
    JOIN public.collaborators c ON t.project_id = c.project_id
    WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
    ORDER BY t.updated_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- Função 5: Retorna a contagem de tarefas por status para os projetos gerenciados.
-- get_manager_tasks_by_status() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_tasks_by_status()
RETURNS TABLE(status_name text, count bigint) AS $$
BEGIN
    SET LOCAL row_security = off; -- Desativa RLS localmente

    RETURN QUERY
    SELECT ts.name, COUNT(t.id)
    FROM public.task_statuses ts
    LEFT JOIN public.tasks t ON t.status_id = ts.id
    WHERE t.project_id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid() AND role = 'Gerente')
    GROUP BY ts.name, ts.display_order -- Adicionado ts.display_order ao GROUP BY
    ORDER BY ts.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 6: Retorna todos os dados do dashboard do gerente em um único objeto JSON.
-- get_manager_dashboard_data() - Nova função consolidada para o frontend.
-- =============================================================================
-- Remove a função existente se ela já existir
DROP FUNCTION IF EXISTS public.get_manager_dashboard_data();

CREATE OR REPLACE FUNCTION public.get_manager_dashboard_data()
RETURNS json AS $$
DECLARE
 kpis_data json;
 recent_projects_data json;
 recent_tasks_data json;
 tasks_by_status_data json;
BEGIN
    -- Desativa RLS localmente para esta função e as funções que ela chama
    -- Isso é necessário para garantir que as funções internas possam ver todos
    -- os dados dos projetos gerenciados, independentemente das políticas RLS
    -- nas tabelas projects e tasks (que dependem de public.is_project_member).
    -- A segurança é mantida pelas políticas RLS na tabela collaborators,
    -- que controla quais projetos get_manager_kpis e as outras funções buscam.
    SET LOCAL row_security = off;

    -- Chamar as funções existentes e coletar resultados
    -- get_manager_kpis retorna JSON diretamente
 SELECT public.get_manager_kpis() INTO kpis_data;

    -- get_manager_recent_projects retorna SETOF projects, agregamos para JSON array
    SELECT to_jsonb(array_agg(p))
    FROM public.get_manager_recent_projects() as p
    INTO recent_projects_data;

    -- get_manager_recent_tasks retorna SETOF tasks, agregamos para JSON array
    SELECT to_jsonb(array_agg(t))
    FROM public.get_manager_recent_tasks() as t
    INTO recent_tasks_data;

    -- get_manager_tasks_by_status retorna TABLE, agregamos para JSON array
    SELECT to_jsonb(array_agg(ts))
    FROM public.get_manager_tasks_by_status() as ts
    INTO tasks_by_status_data;

    -- Construir e retornar o objeto JSON consolidado
    RETURN json_build_object(
 'kpis', kpis_data,
 'recentProjects', recent_projects_data,
 'recentTasks', recent_tasks_data,
 'tasksByStatus', tasks_by_status_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE sobre as funções RAISE NOTICE para depuração:
-- As mensagens RAISE NOTICE adicionadas anteriormente em funções como get_manager_kpis,
-- get_manager_recent_tasks, etc. ainda estarão presentes se você executar
-- individualmente essas funções no SQL Editor.
-- No entanto, ao chamar essas funções DENTRO de get_manager_dashboard_data,
-- as mensagens RAISE NOTICE das funções internas geralmente não aparecem no
-- output da função externa.
-- A depuração principal agora será feita executando get_manager_dashboard_data()
-- e observando o resultado JSON retornado.

-- =============================================================================
-- Função 5: Retorna a contagem de tarefas por status para os projetos gerenciados.
-- get_manager_tasks_by_status() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_tasks_by_status()
RETURNS TABLE(status_name text, count bigint) AS $$
BEGIN
    -- Desativa RLS localmente
    SET LOCAL row_security = off;

    RAISE NOTICE 'Resultado get_manager_tasks_by_status: %', ARRAY(SELECT r FROM (SELECT ts.name, COUNT(t.id) as count FROM public.task_statuses ts LEFT JOIN public.tasks t ON t.status_id = ts.id WHERE t.project_id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid() AND role = 'Gerente') GROUP BY ts.name ORDER BY ts.display_order) as r); -- Debugging

    RETURN QUERY
    SELECT ts.name, COUNT(t.id)
    FROM public.task_statuses ts
    LEFT JOIN public.tasks t ON t.status_id = ts.id
    WHERE t.project_id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid() AND role = 'Gerente')
    GROUP BY ts.name
    ORDER BY ts.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =============================================================================
-- SCRIPT CONSOLIDADO: FUNÇÕES RPC DO GERENTE
-- Este script remove e recria as funções RPC para o dashboard e visualizações do gerente.
-- Inclui desativação local de RLS dentro das funções de agregação para garantir visibilidade de dados.
-- =============================================================================

-- Remove as funções existentes
DROP FUNCTION IF EXISTS public.get_manager_kpis();
DROP FUNCTION IF EXISTS public.get_manager_recent_projects();
DROP FUNCTION IF EXISTS public.get_manager_recent_tasks();
DROP FUNCTION IF EXISTS public.get_manager_tasks_by_status();

-- =============================================================================
-- Função 1: Retorna KPIs agregados dos projetos gerenciados pelo usuário.
-- get_manager_kpis()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_kpis()
RETURNS json AS $$
DECLARE
    managed_project_ids uuid[];
    total_budget numeric;
    overall_progress numeric;
    total_tasks bigint;
    completed_tasks bigint;
    tasks_at_risk bigint;
    done_status_id uuid;
BEGIN
    -- Desativa RLS localmente para garantir visibilidade completa das tabelas usadas na agregação
    SET LOCAL row_security = off;

    -- Obter os IDs dos projetos onde o usuário é Gerente
    -- Assumimos que a RLS na tabela collaborators permite que o usuário veja suas próprias entradas
    SELECT ARRAY(
        SELECT project_id
        FROM public.collaborators
        WHERE user_id = auth.uid() AND role = 'Gerente'
    ) INTO managed_project_ids;

    -- Se não gerencia nenhum projeto, retorna zero.
    IF managed_project_ids IS NULL OR array_length(managed_project_ids, 1) IS NULL THEN
        RETURN json_build_object(
            'total_projects', 0, 'total_budget', 0, 'overall_progress', 0,
            'total_tasks', 0, 'completed_tasks', 0, 'tasks_at_risk', 0
        );
    END IF;

    -- Obter o ID do status "Feito"
    SELECT id INTO done_status_id FROM public.task_statuses WHERE name = 'Feito' LIMIT 1;

    -- Calcular KPIs apenas para os projetos gerenciados
    SELECT
        COALESCE(SUM(budget), 0)
    INTO
        total_budget
    FROM public.projects
    WHERE id = ANY(managed_project_ids);

    SELECT
        COUNT(*),
        COUNT(CASE WHEN status_id = done_status_id THEN 1 END),
        COUNT(CASE WHEN end_date < CURRENT_DATE AND status_id != done_status_id THEN 1 END)
    INTO
        total_tasks,
        completed_tasks,
        tasks_at_risk
    FROM public.tasks
    WHERE project_id = ANY(managed_project_ids);

    SELECT COALESCE(AVG(progress), 0)
    INTO overall_progress
    FROM public.tasks
    WHERE project_id = ANY(managed_project_ids);

    RETURN json_build_object(
        'total_projects', array_length(managed_project_ids, 1),
        'total_budget', total_budget,
        'overall_progress', overall_progress,
        'total_tasks', total_tasks,
        'completed_tasks', completed_tasks,
        'tasks_at_risk', tasks_at_risk
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 4: Retorna as tarefas atualizadas mais recentemente dos projetos gerenciados.
-- get_manager_recent_tasks() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_recent_tasks()
RETURNS SETOF tasks AS $$
BEGIN
    -- Desativa RLS localmente
    SET LOCAL row_security = off;

    -- Adicionado para depuração
    RAISE NOTICE 'Resultado get_manager_recent_tasks: %', ARRAY(SELECT t FROM tasks t JOIN public.collaborators c ON t.project_id = c.project_id WHERE c.user_id = auth.uid() AND c.role = 'Gerente' ORDER BY t.updated_at DESC LIMIT 5);

    RETURN QUERY
    SELECT t.*
    FROM public.tasks t
    JOIN public.collaborators c ON t.project_id = c.project_id
    WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
    ORDER BY t.updated_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =============================================================================
-- Função 2: Retorna os projetos gerenciados pelo usuário.
-- get_managed_projects() - Replicando do use-projects para consistência
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_managed_projects(p_user_id uuid)
RETURNS SETOF projects AS $$
BEGIN
    -- Desativa RLS localmente se necessário para a lógica interna desta função
    SET LOCAL row_security = off;

    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = p_user_id AND c.role = 'Gerente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 3: Retorna os projetos atualizados mais recentemente dos projetos gerenciados.
-- get_manager_recent_projects() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_recent_projects()
RETURNS SETOF projects AS $$
BEGIN
    -- Desativa RLS localmente
    SET LOCAL row_security = off;

    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
    ORDER BY p.updated_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Função 4: Retorna as tarefas atualizadas mais recentemente dos projetos gerenciados.
-- get_manager_recent_tasks() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_recent_tasks()
RETURNS SETOF tasks AS $$
BEGIN
    -- Desativa RLS localmente
    SET LOCAL row_security = off;

    RETURN QUERY
    SELECT t.*
    FROM public.tasks t
    JOIN public.collaborators c ON t.project_id = c.project_id
    WHERE c.user_id = auth.uid() AND c.role = 'Gerente'
    ORDER BY t.updated_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- Função 5: Retorna a contagem de tarefas por status para os projetos gerenciados.
-- get_manager_tasks_by_status() - Baseado em 004_manager_dashboard_functions.sql
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_manager_tasks_by_status()
RETURNS TABLE(status_name text, count bigint) AS $$
BEGIN
    -- Desativa RLS localmente
    SET LOCAL row_security = off;

    RETURN QUERY
    SELECT ts.name, COUNT(t.id)
    FROM public.task_statuses ts
    LEFT JOIN public.tasks t ON t.status_id = ts.id
    WHERE t.project_id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid() AND role = 'Gerente')
    GROUP BY ts.name
    ORDER BY ts.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
