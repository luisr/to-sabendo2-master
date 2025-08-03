-- =============================================================================
--  MIGRAÇÃO 039: RECONSTRUÇÃO FINAL DA ARQUITETURA DE RLS
--  Este script limpa todas as políticas, recria as funções auxiliares com
--  SECURITY DEFINER para evitar recursão, e implementa as permissões
--  granulares corretas para Admins, Gerentes e Membros.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELACIONADAS PARA UM ESTADO LIMPO
-- É crucial dropar todas antes de recriar para garantir um estado limpo e sem conflitos.
DROP POLICY IF EXISTS "Usuários podem interagir com projetos se forem colaboradores" ON public.projects;
DROP POLICY IF EXISTS "Membros podem ver projetos em que colaboram" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;
DROP POLICY IF EXISTS "Membros do projeto podem ver o projeto" ON public.projects;
DROP POLICY IF EXISTS "Gerentes de projeto podem editar o projeto" ON public.projects;

DROP POLICY IF EXISTS "Usuários podem interagir com tarefas se forem colaboradores no projeto" ON public.tasks;
DROP POLICY IF EXISTS "Membros de projeto podem gerenciar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem ver tarefas do projeto" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar o status/progresso das suas tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes podem gerenciar todas as tarefas do projeto" ON public.tasks;

DROP POLICY IF EXISTS "Colaboradores do projeto podem interagir com a lista de colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Membros de projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes podem gerenciar a equipe do projeto" ON public.collaborators;

-- 2. RECRIAR FUNÇÕES AUXILIARES COM SECURITY DEFINER PARA QUEBRAR A RECURSÃO
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


-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS CONFORME A DOCUMENTAÇÃO

-- Para 'projects'
CREATE POLICY "Membros podem ver os projetos dos quais participam" ON public.projects
FOR SELECT USING (public.is_admin() OR public.is_project_member(id));
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (public.is_admin() OR public.is_project_manager(id));

-- Para 'tasks'
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (public.is_admin() OR public.is_project_member(project_id));
CREATE POLICY "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks
FOR UPDATE USING (public.is_admin() OR (public.is_project_member(project_id) AND assignee_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));

-- Para 'collaborators'
CREATE POLICY "Membros podem ver a equipe do projeto" ON public.collaborators
FOR SELECT USING (public.is_admin() OR public.is_project_member(project_id));
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));

-- Para 'task_statuses'
DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Admins e Gerentes podem gerenciar status" ON public.task_statuses;

CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses
FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gerentes e Admins podem gerenciar status" ON public.task_statuses
FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
);
