-- =============================================================================
--  MIGRAÇÃO 005: CORRIGIR FUNÇÃO DO DASHBOARD DO GERENTE
--  Este script corrige a lógica na função get_manager_tasks_by_status
--  para garantir a contagem correta e evitar erros de execução.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_manager_tasks_by_status()
RETURNS TABLE(status_name text, count bigint) AS $$
BEGIN
    -- A lógica foi corrigida para mover o filtro de projeto para dentro
    -- da cláusula ON do LEFT JOIN. Isso é mais eficiente e evita erros
    -- quando um status não possui nenhuma tarefa nos projetos do gerente.
    RETURN QUERY
    SELECT
        ts.name,
        COUNT(t.id)
    FROM
        public.task_statuses ts
    LEFT JOIN
        public.tasks t ON t.status_id = ts.id
        AND t.project_id IN (
            SELECT project_id FROM public.collaborators WHERE user_id = auth.uid() AND role = 'Gerente'
        )
    GROUP BY
        ts.name, ts.display_order
    ORDER BY
        ts.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
