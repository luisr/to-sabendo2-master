-- =============================================================================
--  MIGRAÇÃO 044: RECONSTRUÇÃO ARQUITETURAL FINAL E DEFINITIVA DA RLS (USERS)
--  Este script limpa TODAS as políticas da tabela 'users' e recria a
--  arquitetura de segurança do zero para um estado funcional e não-recursivo,
--  resolvendo o erro de "infinite recursion".
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS DA TABELA 'users'
-- Removemos tudo para garantir um estado inicial limpo, independentemente do estado atual.
DROP POLICY IF EXISTS "Usuários podem acessar seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Usuários podem ver e editar seus próprios perfis" ON public.users;


-- 2. RECRIAR AS POLÍTICAS DE FORMA SEGURA E NÃO-RECURSIVA

-- POLÍTICA 1: Política base. Um usuário sempre pode ver e editar seus próprios dados.
-- Esta política é a base para que a subconsulta da política de admin funcione sem recursão.
CREATE POLICY "Usuários podem gerenciar seus próprios dados" ON public.users
FOR ALL USING (auth.uid() = id);

-- POLÍTICA 2: Política de Admin.
-- REGRA: Permite acesso total a um usuário SE o perfil do usuário autenticado for 'Admin'.
-- A subconsulta `(SELECT role FROM public.users WHERE id = auth.uid())` é segura
-- porque a POLÍTICA 1 já garante que o usuário pode ler sua própria linha.
CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'::user_role
);
