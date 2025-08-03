-- =============================================================================
--  MIGRAÇÃO 045: ARQUITETURA FINAL E DEFINITIVA PARA RLS DA TABELA 'USERS'
--  Este script resolve a recursão infinita na tabela 'users' criando uma
--  função auxiliar segura com SECURITY DEFINER e redefinindo as políticas.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS DA TABELA 'users'
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Usuários podem ver e editar seus próprios perfis" ON public.users;

-- 2. RECRIAR A FUNÇÃO is_admin() DE FORMA SEGURA E NÃO-RECURSIVA
-- SECURITY DEFINER permite que a função ignore a RLS da tabela 'users', quebrando o loop.
-- Usamos auth.uid() aqui, pois a função é simples e chamada em contextos onde o UID está disponível.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RECRIAR AS POLÍTICAS DE FORMA SEGURA

-- POLÍTICA 1: Política base. Um usuário sempre pode ver e editar seus próprios dados.
-- Esta é a regra fundamental que permite que os usuários logados funcionem.
CREATE POLICY "Usuários podem gerenciar seus próprios dados" ON public.users
FOR ALL USING (auth.uid() = id);

-- POLÍTICA 2: Política de Admin.
-- REGRA: Permite acesso total a um usuário SE a função is_admin() retornar true.
-- Como is_admin() é SECURITY DEFINER, esta verificação não causa recursão.
CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
FOR ALL USING (public.is_admin());
