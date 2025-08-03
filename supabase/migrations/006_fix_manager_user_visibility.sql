-- =============================================================================
--  MIGRAÇÃO 006: CORRIGIR VISIBILIDADE DE USUÁRIOS PARA GERENTES
--  Este script permite que Gerentes de Projeto vejam todos os usuários
--  para que possam adicioná-los como colaboradores.
-- =============================================================================

-- 1. Função auxiliar para verificar de forma segura se o usuário atual é Gerente.
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Nova Política de Segurança (RLS).
-- Concede permissão de LEITURA (SELECT) na tabela de usuários para
-- qualquer usuário que tenha a função 'Gerente'.
CREATE POLICY "Gerentes podem ver usuários para adicionar a projetos"
ON public.users FOR SELECT
USING (public.is_manager());
