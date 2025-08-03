-- =============================================================================
--  MIGRAÇÃO 007: FUNÇÃO PARA BUSCAR TAREFAS DO CALENDÁRIO
--  Este script cria uma função RPC inteligente que busca as tarefas
--  relevantes para o calendário, de acordo com o perfil do usuário.
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

    -- Se for Admin, retorna todas as tarefas de todos os projetos.
    IF user_role = 'Admin' THEN
        RETURN QUERY
        SELECT
            t.id,
            t.name,
            t.start_date,
            t.end_date,
            t.priority::text,
            t.project_id,
            p.name as project_name
        FROM
            public.tasks t
        JOIN
            public.projects p ON t.project_id = p.id;
    -- Para Gerentes ou Membros, retorna apenas tarefas dos projetos aos quais pertencem.
    ELSE
        RETURN QUERY
        SELECT
            t.id,
            t.name,
            t.start_date,
            t.end_date,
            t.priority::text,
            t.project_id,
            p.name as project_name
        FROM
            public.tasks t
        JOIN
            public.projects p ON t.project_id = p.id
        WHERE
            t.project_id IN (
                SELECT project_id FROM public.collaborators WHERE user_id = auth.uid()
            );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
