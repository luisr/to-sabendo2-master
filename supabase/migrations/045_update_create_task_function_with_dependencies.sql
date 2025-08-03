-- =============================================================================
--  MIGRAÇÃO 045: ATUALIZAR FUNÇÃO DE CRIAÇÃO DE TAREFA COM DEPENDÊNCIAS
--  Este script redefine a função `create_task_with_sequential_id` para
--  aceitar um array de IDs de dependência, alinhando-a com a UI.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_task_with_sequential_id(
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
    p_dependencies uuid[] DEFAULT ARRAY[]::uuid[] -- Novo parâmetro
)
RETURNS tasks AS $$
#variable_conflict use_variable
DECLARE
    new_wbs_code text;
    task_count integer;
    new_task tasks;
BEGIN
    -- Contar tarefas para gerar o WBS code
    SELECT COUNT(*) + 1 INTO task_count FROM public.tasks WHERE project_id = p_project_id;
    new_wbs_code := 'TSK-' || lpad(task_count::text, 4, '0');

    -- Inserir a nova tarefa, incluindo o campo de dependências
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
