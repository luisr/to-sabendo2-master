-- =============================================================================
--  MIGRAÇÃO 015: CORRIGIR POLÍTICA DE SEGURANÇA DAS LINHAS DE BASE
--  Este script corrige a RLS da tabela `baselines`, restringindo a
--  criação e exclusão de linhas de base apenas para Gerentes de Projeto.
-- =============================================================================

-- 1. Remove a política antiga e permissiva.
-- A política antiga era baseada em `is_project_member`.
DROP POLICY IF EXISTS "Acesso baseado na associação ao projeto" ON public.baselines;

-- 2. Cria a nova política correta e restritiva.
-- A nova política garante que apenas Gerentes de Projeto (`is_project_manager`)
-- possam criar, editar ou excluir linhas de base.
CREATE POLICY "Apenas gerentes podem manipular linhas de base"
ON public.baselines FOR ALL
USING (is_project_manager((SELECT project_id FROM tasks WHERE id = task_id)))
WITH CHECK (is_project_manager((SELECT project_id FROM tasks WHERE id = task_id)));
