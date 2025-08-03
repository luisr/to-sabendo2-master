-- =============================================================================
--  MIGRAÇÃO 009: CORREÇÃO FINAL DA FUNÇÃO DO CALENDÁRIO
--  Este script torna a função `get_calendar_tasks` mais robusta, lidando
--  com casos em que a sessão do usuário pode não estar disponível.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_calendar_tasks()
RETURNS TABLE (
    id uuid,
    name text,
    start_date date,
    end_date date,
    priority text,
    project_id uuid,
    project_name text
) AS $$
DECLARE
    user_id uuid := auth.uid();
    user_role text;
BEGIN
    -- Se o UID do usuário for nulo, retorna um conjunto vazio para evitar erros.
    IF user_id IS NULL THEN
        RETURN;
    END IF;

    -- Obter a role do usuário atual
    SELECT role INTO user_role FROM public.users WHERE id = user_id;

    -- Se for Admin, retorna todas as tarefas de todos os projetos com datas válidas.
    IF user_role = 'Admin' THEN
        RETURN QUERY
        SELECT
            t.id, t.name, t.start_date, t.end_date, t.priority::text, t.project_id, p.name as project_name
        FROM
            public.tasks t
        JOIN
            public.projects p ON t.project_id = p.id
        WHERE
            t.start_date IS NOT NULL AND t.end_date IS NOT NULL;
    -- Para Gerentes ou Membros, retorna apenas tarefas dos seus projetos com datas válidas.
    ELSE
        RETURN QUERY
        SELECT
            t.id, t.name, t.start_date, t.end_date, t.priority::text, t.project_id, p.name as project_name
        FROM
            public.tasks t
        JOIN
            public.projects p ON t.project_id = p.id
        WHERE
            t.project_id IN (SELECT c.project_id FROM public.collaborators c WHERE c.user_id = user_id)
            AND t.start_date IS NOT NULL AND t.end_date IS NOT NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
