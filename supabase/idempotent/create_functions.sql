-- =============================================================================
--  SCRIPT DE CRIAÇÃO DE FUNÇÕES (IDEMPOTENTE)
--  Este script garante que todas as funções do banco de dados existam e
--  estejam atualizadas. Utiliza CREATE OR REPLACE para ser seguro.
-- =============================================================================

-- 1. FUNÇÕES DE AUTOMAÇÃO E TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2. FUNÇÕES AUXILIARES PARA RLS (Row Level Security)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- 3. FUNÇÕES RPC PARA A APLICAÇÃO
-- Se você tiver funções de Remote Procedure Call, elas devem ser adicionadas aqui.
-- Exemplo:
/*
CREATE OR REPLACE FUNCTION public.get_user_projects(p_user_id uuid)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
*/
