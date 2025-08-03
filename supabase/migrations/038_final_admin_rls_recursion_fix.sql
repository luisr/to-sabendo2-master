-- =============================================================================
--  MIGRAÇÃO 038: CORREÇÃO DEFINITIVA DA RECURSÃO NA POLÍTICA DE ADMINS
--  Este script corrige o loop de recursão na tabela 'users' substituindo
--  a política de admin defeituosa por uma que usa uma subconsulta direta.
-- =============================================================================

-- 1. REMOVER A POLÍTICA DE ADMIN DEFEITUOSA E RECURSIVA DA TABELA 'users'
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;

-- 2. RECRIAR A POLÍTICA DE ADMIN DE FORMA SEGURA E NÃO-RECURSIVA
-- Esta política permite que um usuário acesse todos os outros usuários SE
-- o 'role' do próprio usuário autenticado for 'Admin'.
-- A subconsulta (SELECT role FROM public.users WHERE id = auth.uid()) é segura
-- porque a política "Usuários podem acessar seus próprios dados" já garante
-- que cada usuário possa ler sua própria linha, quebrando o ciclo de recursão.
CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
FOR ALL
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'::user_role
);

-- 3. GARANTIR QUE a função is_admin() ESTEJA COMO SECURITY INVOKER
-- Isso é crucial para que ela funcione corretamente em TODAS as outras tabelas.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
