-- =============================================================================
--  MIGRAÇÃO 016: FUNÇÃO PARA O BACKLOG GLOBAL DO ADMIN
--  Este script cria uma função RPC que busca todas as tarefas com status
--  'A Fazer' de todos os projetos, exclusivamente para o Super Admin.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_global_backlog_tasks()
RETURNS TABLE (
    id uuid,
    name text,
    priority text,
    status_id uuid,
    project_id uuid,
    assignee_id uuid,
    project_name text
) AS $$
DECLARE
    todo_status_id uuid;
BEGIN
    -- Esta função é apenas para Admins
    IF NOT is_admin() THEN
        RETURN;
    END IF;

    -- Obter o ID do status "A Fazer"
    SELECT id INTO todo_status_id FROM public.task_statuses WHERE name = 'A Fazer' LIMIT 1;

    -- Retorna todas as tarefas "A Fazer" de todos os projetos
    IF todo_status_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            t.id,
            t.name,
            t.priority::text,
            t.status_id,
            t.project_id,
            t.assignee_id,
            p.name as project_name
        FROM
            public.tasks t
        JOIN
            public.projects p ON t.project_id = p.id
        WHERE
            t.status_id = todo_status_id
        ORDER BY
            p.name, t.name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
