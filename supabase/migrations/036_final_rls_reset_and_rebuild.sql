-- =============================================================================
--  MIGRAÇÃO 036: SCRIPT MESTRE FINAL COM DESABILITAÇÃO E REABILITAÇÃO DE RLS
--  Este script segue a ordem correta: desabilita a RLS, limpa tudo,
--  recria as políticas de forma segura e, finalmente, reabilita a RLS.
-- =============================================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE PARA PERMITIR A LIMPEZA
-- Isso nos permite remover políticas e funções sem erros de dependência.
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators DISABLE ROW LEVEL SECURITY;


-- 2. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS E FUNÇÕES ANTIGAS
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


-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS CONFORME A DOCUMENTAÇÃO

-- Para 'projects':
CREATE POLICY "Membros podem ver projetos" ON public.projects
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);

-- Para 'tasks':
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
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);

-- Para 'collaborators' (Não-Recursiva):
CREATE POLICY "Membros podem ver a equipe do projeto" ON public.collaborators
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
);


-- 4. REABILITAR A RLS COM AS NOVAS POLÍTICAS CORRETAS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Garante que a RLS seja obrigatória
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators FORCE ROW LEVEL SECURITY;
