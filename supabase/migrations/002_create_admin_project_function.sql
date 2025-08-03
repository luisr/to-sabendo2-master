-- =============================================================================
--  MIGRAÇÃO 002: CRIAR FUNÇÃO PARA ADMIN BUSCAR TODOS OS PROJETOS
--  Este script cria a função `get_all_projects_for_admin`
-- =============================================================================

CREATE OR REPLACE FUNCTION get_all_projects_for_admin()
RETURNS SETOF projects AS $$
BEGIN
    -- Verifica se o usuário autenticado é um admin
    IF (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin' THEN
        -- Se for admin, retorna todos os projetos
        RETURN QUERY SELECT * FROM public.projects;
    ELSE
        -- Se não for admin, retorna apenas os projetos dos quais ele é colaborador
        RETURN QUERY
        SELECT p.*
        FROM public.projects p
        JOIN public.collaborators c ON p.id = c.project_id
        WHERE c.user_id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
