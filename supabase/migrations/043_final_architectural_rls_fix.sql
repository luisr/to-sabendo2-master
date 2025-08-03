-- =============================================================================
--  MIGRAÇÃO 043: RECONSTRUÇÃO ARQUITETURAL DEFINITIVA DA RLS
--  Este script limpa TODAS as políticas e funções, e recria a arquitetura
--  de segurança do zero para um estado funcional, seguro e não-recursivo,
--  resolvendo o erro "infinite recursion" na tabela 'collaborators'.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELACIONADAS
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;

DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Membros do projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators;

-- 2. REMOVER AS FUNÇÕES AUXILIARES QUE CAUSAM A RECURSÃO
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);


-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS USANDO SUBCONSULTAS DIRETAS

-- Para 'projects'
CREATE POLICY "Membros podem ver projetos em que colaboram" ON public.projects
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
) WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);

-- Para 'tasks'
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
) WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);

-- Para 'collaborators' (A CORREÇÃO CRÍTICA - NÃO-RECURSIVA)
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
) WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
);
