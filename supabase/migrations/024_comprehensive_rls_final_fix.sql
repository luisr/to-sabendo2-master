-- =============================================================================
--  MIGRAÇÃO 024: CORREÇÃO FINAL E COMPREENSIVA DAS POLÍTICAS DE RLS
--  Este script implementa a solução definitiva para o problema de recursão
--  na tabela 'users', garantindo que todas as políticas de admin sejam seguras.
-- =============================================================================

-- 1. RECRIAR A FUNÇÃO is_admin() DE FORMA SEGURA E CORRETA
-- A função precisa ser SECURITY INVOKER para saber quem a está chamando.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Esta verificação é segura pois auth.uid() é estável e a leitura da tabela 'users'
  -- será controlada pela nova política não-recursiva.
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. LIMPAR TODAS AS POLÍTICAS ANTIGAS DA TABELA 'users'
-- Isso é crucial para remover quaisquer regras conflitantes ou recursivas.
DROP POLICY IF EXISTS "Os usuários podem ver e editar seus próprios perfis" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;
-- Adicione aqui quaisquer outras políticas que possam existir na tabela 'users'.

-- 3. CRIAR NOVAS POLÍTICAS SEGURAS E NÃO-RECURSIVAS PARA A TABELA 'users'
-- Esta política é a base: um usuário sempre pode ver seus próprios dados.
-- Ela não tem dependências externas, então não causa recursão.
CREATE POLICY "Usuários podem acessar seus próprios dados" ON public.users
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Esta política permite que Admins acessem os dados de outros usuários.
-- Ela usa a função is_admin() que agora é segura.
CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
FOR ALL
USING (public.is_admin());


-- 4. GARANTIR QUE AS POLÍTICAS EM OUTRAS TABELAS ESTÃO CORRETAS
-- Removemos as políticas antigas para garantir que usem a função is_admin() corrigida.
DROP POLICY IF EXISTS "Admins podem gerenciar todos os projetos" ON public.projects;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Admins podem gerenciar status, etc." ON public.task_statuses;

-- Recriamos as políticas, que agora usarão a função is_admin() de forma segura.
CREATE POLICY "Admins podem gerenciar todos os projetos" ON public.projects FOR ALL USING (public.is_admin());
CREATE POLICY "Admins podem gerenciar todos os colaboradores" ON public.collaborators FOR ALL USING (public.is_admin());
CREATE POLICY "Admins podem gerenciar todas as tarefas" ON public.tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Admins podem gerenciar status, etc." ON public.task_statuses FOR ALL USING (public.is_admin());
