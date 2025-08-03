-- =============================================================================
--  MIGRAÇÃO 010: FUNÇÃO PARA BUSCAR PROJETOS GERENCIADOS (CORRIGIDA)
--  Este script atualiza a função para aceitar um user_id como parâmetro,
--  evitando problemas de contexto com auth.uid() em funções SECURITY DEFINER.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_managed_projects(p_user_id uuid)
RETURNS SETOF projects AS $$
BEGIN
    -- Retorna todos os projetos onde o usuário especificado é um colaborador
    -- com a função específica de 'Gerente'.
    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = p_user_id AND c.role = 'Gerente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
