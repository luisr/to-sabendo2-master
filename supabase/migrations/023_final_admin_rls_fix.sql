-- =============================================================================
--  MIGRAÇÃO 023: CORREÇÃO DEFINITIVA DO CONTEXTO DE SEGURANÇA PARA ADMINS
--  Este script corrige a causa raiz dos problemas de permissão, ajustando
--  a função is_admin() para SECURITY INVOKER e tratando o caso de recursão
--  na tabela 'users' com uma política de subconsulta direta.
-- =============================================================================

-- 1. CORRIGIR A FUNÇÃO is_admin()
-- Esta função precisa saber quem a está chamando. SECURITY INVOKER é o correto.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- CORRIGIDO

-- 2. CORRIGIR A POLÍTICA DE ADMIN NA TABELA 'users' PARA EVITAR RECURSÃO
-- Removemos a política antiga que chamava a função.
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;

-- Criamos uma nova política que faz a verificação com uma subconsulta direta,
-- evitando a chamada de função e o loop de recursão.
CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'::user_role
);

-- 3. GARANTIR QUE AS OUTRAS POLÍTICAS DE ADMIN ESTÃO CORRETAS
-- Removemos as políticas antigas para garantir que usem a função is_admin() corrigida.
DROP POLICY IF EXISTS "Admins podem gerenciar todos os projetos" ON public.projects;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Admins podem gerenciar status, etc." ON public.task_statuses;


-- Recriamos as políticas, que agora usarão a função is_admin() com SECURITY INVOKER,
-- que funciona corretamente para estas tabelas.
CREATE POLICY "Admins podem gerenciar todos os projetos" ON public.projects FOR ALL USING (public.is_admin());
CREATE POLICY "Admins podem gerenciar todos os colaboradores" ON public.collaborators FOR ALL USING (public.is_admin());
CREATE POLICY "Admins podem gerenciar todas as tarefas" ON public.tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Admins podem gerenciar status, etc." ON public.task_statuses FOR ALL USING (public.is_admin());
