-- =============================================================================
--  MIGRAÇÃO 003: FUNÇÕES DE AGREGAÇÃO PARA O DASHBOARD DO ADMIN
--  Este script cria várias funções RPC para buscar dados consolidados.
-- =============================================================================

-- Função 1: Retorna KPIs agregados de todos os projetos.
CREATE OR REPLACE FUNCTION get_consolidated_kpis()
RETURNS json AS $$
DECLARE
    total_projects bigint;
    total_budget numeric;
    overall_progress numeric;
    total_tasks bigint;
    completed_tasks bigint;
    tasks_at_risk bigint;
    done_status_id uuid;
BEGIN
    -- Somente admins podem executar esta função
    IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'Admin' THEN
        RETURN json_build_object('error', 'Acesso negado');
    END IF;

    -- Obter o ID do status "Feito"
    SELECT id INTO done_status_id FROM public.task_statuses WHERE name = 'Feito' LIMIT 1;

    -- Calcular KPIs
    SELECT
        COUNT(*),
        COALESCE(SUM(budget), 0)
    INTO
        total_projects,
        total_budget
    FROM public.projects;

    SELECT
        COUNT(*),
        COUNT(CASE WHEN status_id = done_status_id THEN 1 END),
        COUNT(CASE WHEN end_date < CURRENT_DATE AND status_id != done_status_id THEN 1 END)
    INTO
        total_tasks,
        completed_tasks,
        tasks_at_risk
    FROM public.tasks;

    SELECT COALESCE(AVG(progress), 0)
    INTO overall_progress
    FROM public.tasks;

    RETURN json_build_object(
        'total_projects', total_projects,
        'total_budget', total_budget,
        'overall_progress', overall_progress,
        'total_tasks', total_tasks,
        'completed_tasks', completed_tasks,
        'tasks_at_risk', tasks_at_risk
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função 2: Retorna os projetos mais recentes.
CREATE OR REPLACE FUNCTION get_recent_projects()
RETURNS SETOF projects AS $$
BEGIN
    IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'Admin' THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM public.projects ORDER BY created_at DESC LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função 3: Retorna as tarefas atualizadas mais recentemente.
CREATE OR REPLACE FUNCTION get_recent_tasks()
RETURNS SETOF tasks AS $$
BEGIN
    IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'Admin' THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM public.tasks ORDER BY updated_at DESC LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função 4: Retorna a contagem de tarefas por status para todos os projetos.
CREATE OR REPLACE FUNCTION get_tasks_by_status_consolidated()
RETURNS TABLE(status_name text, count bigint) AS $$
BEGIN
    IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'Admin' THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT ts.name, COUNT(t.id)
    FROM public.task_statuses ts
    LEFT JOIN public.tasks t ON t.status_id = ts.id
    GROUP BY ts.name
    ORDER BY ts.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
