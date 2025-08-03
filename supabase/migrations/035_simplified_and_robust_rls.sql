-- =============================================================================
--  MIGRAÇÃO 035: ARQUITETURA DE RLS FINAL, SIMPLIFICADA E ROBUSTA
--  Este script mestre implementa a arquitetura de segurança correta,
--  removendo todas as políticas antigas e funções problemáticas e criando
--  regras granulares e não-recursivas alinhadas com as regras de negócio.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS E FUNÇÕES RELACIONADAS
-- Removemos tudo para garantir um estado inicial limpo e sem conflitos.
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

DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);

-- 2. RECRIAR POLÍTICAS GRANULARES E SEGURAS CONFORME A DOCUMENTAÇÃO

-- Para a tabela 'projects'
CREATE POLICY "Membros podem ver os projetos em que colaboram" ON public.projects
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);

-- Para a tabela 'tasks'
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid())
);
CREATE POLICY "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks
FOR UPDATE USING (
    public.is_admin() OR
    (EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid()) AND tasks.assignee_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas do projeto" ON public.tasks
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);

-- Para a tabela 'collaborators' (Não-Recursiva)
CREATE POLICY "Membros podem ver a equipe do projeto" ON public.collaborators
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
);

-- Para a tabela 'task_statuses'
DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Admins e Gerentes podem gerenciar status" ON public.task_statuses;

CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses
FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gerentes e Admins podem gerenciar status" ON public.task_statuses
FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
);
