-- =============================================================================
--  MIGRAÇÃO 017: FUNÇÃO PARA CRIAR TAREFA COM ID SEQUENCIAL (WBS_CODE)
--  Este script cria uma função que gera um ID sequencial formatado (TSK-XXXX)
--  para cada nova tarefa, garantindo unicidade dentro do projeto.
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
    p_progress integer DEFAULT 0
)
RETURNS tasks AS $$
DECLARE
    new_wbs_code text;
    task_count integer;
    new_task tasks;
BEGIN
    -- Contar o número de tarefas existentes no projeto para determinar o próximo número
    SELECT COUNT(*) + 1 INTO task_count FROM public.tasks WHERE project_id = p_project_id;

    -- Formatar o novo wbs_code (ex: TSK-0001)
    new_wbs_code := 'TSK-' || lpad(task_count::text, 4, '0');

    -- Inserir a nova tarefa com o wbs_code gerado
    INSERT INTO public.tasks (
        project_id,
        name,
        description,
        assignee_id,
        status_id,
        priority,
        start_date,
        end_date,
        progress,
        wbs_code
    )
    VALUES (
        p_project_id,
        p_name,
        p_description,
        p_assignee_id,
        p_status_id,
        p_priority,
        p_start_date,
        p_end_date,
        p_progress,
        new_wbs_code
    )
    RETURNING * INTO new_task;

    -- Retornar a tarefa recém-criada
    RETURN new_task;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
