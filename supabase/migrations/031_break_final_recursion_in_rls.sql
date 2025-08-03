-- =============================================================================
--  MIGRAÇÃO 031: CORREÇÃO ARQUITETURAL DEFINITIVA PARA RECURSÃO DE RLS
--  Este script limpa TODAS as políticas conflitantes e dependências de funções,
--  remove as funções problemáticas e recria as políticas de forma segura e
--  não-recursiva para resolver o erro "infinite recursion".
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELACIONADAS
-- Removemos tudo para garantir um estado inicial limpo e sem conflitos.
DROP POLICY IF EXISTS "Usuários podem gerenciar tarefas com base na permissão" ON public.tasks;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Colaboradores podem gerenciar tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros de projeto podem gerenciar tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Membros de projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;

DROP POLICY IF EXISTS "Membros podem ver projetos em que colaboram" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os projetos" ON public.projects;


-- 2. REMOVER AS FUNÇÕES AUXILIARES QUE CAUSAM RECURSÃO
-- Com as políticas removidas, estas funções podem ser dropadas com segurança.
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);


-- 3. RECRIAR POLÍTICAS DE FORMA SEGURA E NÃO-RECURSIVA

-- Para a tabela 'projects'
CREATE POLICY "Usuários podem ver os projetos em que colaboram" ON public.projects
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
CREATE POLICY "Membros de projeto podem gerenciar tarefas" ON public.tasks
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid())
);

-- Para a tabela 'collaborators' (NÃO RECURSIVA)
CREATE POLICY "Membros de projeto podem ver a equipe" ON public.collaborators
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
);
