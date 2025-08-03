-- =============================================================================
--  MIGRAÇÃO 037: SCRIPT MESTRE E DEFINITIVO PARA RECONSTRUÇÃO DA RLS
--  Este script limpa TODAS as políticas e funções, e recria a arquitetura
--  de segurança do zero para um estado funcional, seguro e não-recursivo.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS E FUNÇÕES RELACIONADAS
-- Removemos tudo para garantir um estado inicial limpo, independentemente do estado atual.
DROP POLICY IF EXISTS "Usuários podem acessar seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;

DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;

DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators;

DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar status" ON public.task_statuses;

DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);

-- 2. RECRIAR A FUNÇÃO is_admin() DE FORMA SEGURA
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- 3. RECRIAR TODAS AS POLÍTICAS DE FORMA SEGURA E NÃO-RECURSIVA

-- Para 'users' (A MAIS IMPORTANTE)
CREATE POLICY "Usuários podem ver e editar seus próprios dados" ON public.users
FOR ALL USING (auth.uid() = id);

CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
FOR ALL USING (public.is_admin());

-- Para 'projects'
CREATE POLICY "Membros podem ver projetos em que colaboram" ON public.projects
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid()));

CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente'));

-- Para 'tasks'
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid()));

CREATE POLICY "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks
FOR UPDATE USING (public.is_admin() OR (EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid()) AND tasks.assignee_id = auth.uid()));

CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente'));

-- Para 'collaborators'
CREATE POLICY "Membros podem ver a equipe do projeto" ON public.collaborators
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()));

CREATE POLICY "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators
FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente'));

-- Para 'task_statuses'
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Gerentes e Admins podem gerenciar status" ON public.task_statuses
FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role));
