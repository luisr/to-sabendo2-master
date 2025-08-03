-- =============================================================================
--  MIGRAÇÃO 008: CORRIGIR FUNÇÃO DO CALENDÁRIO
--  Este script torna a função `get_calendar_tasks` mais robusta, garantindo
--  que ela retorne apenas tarefas que possuam datas válidas.
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
    user_role text;
BEGIN
    -- Obter a role do usuário atual
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();

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
            t.start_date IS NOT NULL AND t.end_date IS NOT NULL; -- Adicionado filtro de segurança
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
            t.project_id IN (SELECT project_id FROM public.collaborators WHERE user_id = auth.uid())
            AND t.start_date IS NOT NULL AND t.end_date IS NOT NULL; -- Adicionado filtro de segurança
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
