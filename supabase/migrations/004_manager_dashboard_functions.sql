-- =============================================================================
--  MIGRAÇÃO 004: FUNÇÕES DE AGREGAÇÃO PARA O DASHBOARD DO GERENTE
--  Este script cria funções RPC para buscar dados consolidados dos projetos
--  gerenciados por um usuário específico.
-- =============================================================================

-- Função 1: Retorna KPIs agregados dos projetos gerenciados pelo usuário.
CREATE OR REPLACE FUNCTION get_manager_kpis()
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
    -- Obter os IDs dos projetos onde o usuário é Gerente
    SELECT ARRAY(
        SELECT project_id
        FROM public.collaborators
        WHERE user_id = auth.uid() AND role = 'Gerente'
    ) INTO managed_project_ids;
    RAISE NOTICE 'Managed Project IDs: %', managed_project_ids;

    -- Se não gerencia nenhum projeto, retorna nulo.
    IF array_length(managed_project_ids, 1) IS NULL THEN
        RETURN json_build_object(
            'total_projects', 0, 'total_budget', 0, 'overall_progress', 0,
            'total_tasks', 0, 'completed_tasks', 0, 'tasks_at_risk', 0
        );
    END IF;

    -- Obter o ID do status "Feito"
    SELECT id INTO done_status_id FROM public.task_statuses WHERE name = 'Feito' LIMIT 1;

    -- Calcular KPIs apenas para os projetos gerenciados
    SET LOCAL row_security = off;

    RAISE NOTICE 'Calculating total budget...';
    SELECT
        COALESCE(SUM(budget), 0)
    INTO
        total_budget
    FROM public.projects
    WHERE id = ANY(managed_project_ids);

    RAISE NOTICE 'Calculating task counts...';
    SELECT
        COUNT(*),
        COUNT(CASE WHEN status_id = done_status_id THEN 1 END),
        COUNT(CASE WHEN end_date < CURRENT_DATE AND status_id IS DISTINCT FROM done_status_id THEN 1 END)
    INTO
        total_tasks,
        completed_tasks,
        tasks_at_risk
    FROM public.tasks
    WHERE project_id = ANY(managed_project_ids);

    RAISE NOTICE 'Calculating overall progress...';
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


-- Função 2: Retorna as tarefas atualizadas mais recentemente dos projetos gerenciados.
CREATE OR REPLACE FUNCTION get_manager_recent_tasks()
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
    -- RAISE NOTICE 'Recent Tasks: %', ARRAY(SELECT t FROM tasks t WHERE t.id IN (SELECT id FROM get_manager_recent_tasks())); -- Não podemos usar o nome da função dentro dela assim para logar o resultado diretamente de SETOF
    -- Logging SETOF functions is tricky; we'll rely on whether the frontend receives data or an error.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função 3: Retorna a contagem de tarefas por status para os projetos gerenciados.
CREATE OR REPLACE FUNCTION get_manager_tasks_by_status()
RETURNS TABLE(status_name text, count bigint) AS $$
BEGIN
    RETURN QUERY
    SET LOCAL row_security = off; -- Desativa RLS localmente
    SELECT ts.name, COUNT(t.id)
    FROM public.task_statuses ts
    LEFT JOIN public.tasks t ON t.status_id = ts.id
    WHERE t.project_id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid() AND role = 'Gerente')
    GROUP BY ts.name
    ORDER BY ts.display_order;
END;
    -- RAISE NOTICE 'Tasks by Status: %', ARRAY(SELECT r FROM get_manager_tasks_by_status()); -- Similarmente, logging TABLE functions directly within is complex.
$$ LANGUAGE plpgsql SECURITY DEFINER;
