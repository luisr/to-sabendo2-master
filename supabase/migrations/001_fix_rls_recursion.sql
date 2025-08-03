-- =============================================================================
--  MIGRAÇÃO 001: CORRIGIR RECURSÃO NAS FUNÇÕES DE RLS
--  Este script corrige o erro "stack depth limit exceeded" sem apagar dados.
-- =============================================================================

-- Esta migração atualiza as funções de segurança (RLS) para evitar recursão infinita,
-- adicionando a diretiva `SECURITY DEFINER`.
-- Execute este script uma vez para aplicar a correção.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'Gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
