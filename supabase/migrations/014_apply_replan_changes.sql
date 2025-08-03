-- =============================================================================
--  MIGRAÇÃO 014: FUNÇÃO PARA APLICAR REPLANEJAMENTO
--  Este script cria a função RPC `apply_replan_changes` que executa
--  as sugestões de replanejamento aprovadas pelo usuário.
-- =============================================================================

CREATE OR REPLACE FUNCTION apply_replan_changes(
    p_project_id uuid,
    p_observation text,
    p_approved_changes jsonb
)
RETURNS void AS $$
DECLARE
    change jsonb;
    task_id_to_update uuid;
    default_status_id uuid;
BEGIN
    -- Somente gerentes ou admins podem executar
    IF NOT (is_manager() OR is_admin()) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Obter o ID do status padrão ('A Fazer') para novas tarefas
    SELECT id INTO default_status_id FROM public.task_statuses WHERE name = 'A Fazer' LIMIT 1;

    -- Iterar sobre cada mudança aprovada
    FOR change IN SELECT * FROM jsonb_array_elements(p_approved_changes)
    LOOP
        -- Ação: ATUALIZAR uma tarefa existente
        IF (change->>'action') = 'update' THEN
            SELECT id INTO task_id_to_update FROM public.tasks
            WHERE project_id = p_project_id AND name = (change->>'taskName');

            IF task_id_to_update IS NOT NULL THEN
                UPDATE public.tasks
                SET
                    start_date = (change->'changes'->>'new_start_date')::date,
                    end_date = (change->'changes'->>'new_end_date')::date,
                    observation = p_observation
                WHERE id = task_id_to_update;
            END IF;

        -- Ação: CRIAR uma nova tarefa
        ELSIF (change->>'action') = 'create' THEN
            INSERT INTO public.tasks (project_id, name, start_date, end_date, observation, status_id, priority, progress)
            VALUES (
                p_project_id,
                change->>'taskName',
                (change->'changes'->>'new_start_date')::date,
                (change->'changes'->>'new_end_date')::date,
                p_observation,
                default_status_id,
                'Média', -- Prioridade padrão
                0 -- Progresso inicial
            );
            
        -- Ação: EXCLUIR uma tarefa existente
        ELSIF (change->>'action') = 'delete' THEN
            DELETE FROM public.tasks
            WHERE project_id = p_project_id AND name = (change->>'taskName');
        END IF;
    END LOOP;

    -- Finalmente, registrar a operação de replanejamento no histórico
    INSERT INTO public.replan_history (project_id, user_id, observation, changes)
    VALUES (p_project_id, auth.uid(), p_observation, p_approved_changes);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
