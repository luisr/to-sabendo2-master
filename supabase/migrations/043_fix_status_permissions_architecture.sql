-- =============================================================================
--  MIGRAÇÃO 043: CORREÇÃO ARQUITETURAL DAS PERMISSÕES DE STATUS
--  Este script limpa e recria as políticas da tabela task_statuses para
--  garantir que Gerentes e Admins possam gerenciar colunas, e todos os
--  usuários autenticados possam visualizá-las.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DAS POLÍTICAS DE TASK_STATUSES
DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar status" ON public.task_statuses;
DROP POLICY IF EXISTS "Admins podem gerenciar status, etc." ON public.task_statuses;


-- 2. RECRIAR POLÍTICAS CORRETAS E SEGURAS

-- REGRA 1: Qualquer usuário logado pode ver a lista de status.
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses
FOR SELECT
USING (auth.role() = 'authenticated');

-- REGRA 2: Apenas Gerentes e Admins podem gerenciar (criar, editar, excluir) os status.
CREATE POLICY "Gerentes e Admins podem gerenciar status" ON public.task_statuses
FOR ALL
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
)
WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
);
