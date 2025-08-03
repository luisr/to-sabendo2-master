-- =============================================================================
-- FUNÇÃO PARA VISÃO CONSOLIDADA
-- Retorna todas as tarefas de todos os projetos aos quais o usuário logado
-- pertence como colaborador.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_all_visible_tasks()
RETURNS SETOF tasks AS $$
BEGIN
  -- A função é SECURITY DEFINER, então ela bypassa a RLS.
  -- Nós re-implementamos a lógica de segurança aqui dentro.
  RETURN QUERY
  SELECT t.*
  FROM public.tasks t
  WHERE t.project_id IN (
    SELECT c.project_id
    FROM public.collaborators c
    WHERE c.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
