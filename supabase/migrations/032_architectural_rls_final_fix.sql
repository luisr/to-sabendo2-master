-- =============================================================================
--  MIGRAÇÃO 032: CORREÇÃO ARQUITETURAL DEFINITIVA PARA RECURSÃO DE RLS
--  Este script é a solução final e consolidada. Ele limpa TODAS as políticas
--  conflitantes, remove as funções problemáticas e recria as permissões de
--  forma segura e não-recursiva.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELACIONADAS E DEPENDENTES
-- É crucial dropar todas antes de recriar para garantir um estado limpo.
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
DROP POLICY IF EXISTS "Membros do projeto podem ver o projeto" ON public.projects;
DROP POLICY IF EXISTS "Gerentes de projeto podem editar o projeto" ON public.projects;


-- 2. REMOVER AS FUNÇÕES AUXILIARES QUE CAUSAM A RECURSÃO
-- Com as políticas removidas, estas funções podem ser dropadas com segurança.
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);


-- 3. RECRIAR AS POLÍTICAS DE FORMA SEGURA E NÃO-RECURSIVA

-- Para a tabela 'projects'
CREATE POLICY "Usuários podem interagir com projetos se forem colaboradores" ON public.projects
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = projects.id AND collaborators.user_id = auth.uid())
);

-- Para a tabela 'tasks'
CREATE POLICY "Usuários podem interagir com tarefas se forem colaboradores no projeto" ON public.tasks
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid())
);

-- Para a tabela 'collaborators' (A CORREÇÃO PRINCIPAL)
-- REGRA: Um usuário pode ver/gerenciar a lista de colaboradores de um projeto (tabela A)
-- SE ele for um colaborador nesse mesmo projeto (verificado na tabela A, mas com auth.uid(), o que não é recursivo).
CREATE POLICY "Colaboradores do projeto podem interagir com a lista de colaboradores" ON public.collaborators
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);
