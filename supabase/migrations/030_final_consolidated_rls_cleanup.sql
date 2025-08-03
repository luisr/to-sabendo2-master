-- =============================================================================
--  MIGRAÇÃO 030: SCRIPT MESTRE E DEFINITIVO PARA CORREÇÃO DE RLS
--  Este script limpa TODAS as políticas conflitantes e suas dependências,
--  remove as funções auxiliares problemáticas, e recria as políticas de
--  forma segura e não-recursiva para todas as tabelas relevantes.
-- =============================================================================

-- 1. LIMPEZA COMPLETA E ORDENADA DE TODAS AS POLÍTICAS DEPENDENTES
DROP POLICY IF EXISTS "Membros do projeto podem ver o projeto" ON public.projects;
DROP POLICY IF EXISTS "Gerentes de projeto podem editar o projeto" ON public.projects;
DROP POLICY IF EXISTS "Gerentes de projeto podem adicionar/remover colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Colaboradores podem ver uns aos outros no projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Acesso baseado na associação ao projeto" ON public.task_dependencies;
DROP POLICY IF EXISTS "Acesso baseado na associação ao projeto" ON public.change_history;
DROP POLICY IF EXISTS "Acesso baseado na associação ao projeto" ON public.baselines;
DROP POLICY IF EXISTS "Apenas gerentes podem manipular linhas de base" ON public.baselines;
DROP POLICY IF EXISTS "Gerentes podem ver o histórico do seus projetos" ON public.replan_history;
DROP POLICY IF EXISTS "Membros do projeto podem gerenciar tarefas" ON public.tasks;

-- Limpando políticas de scripts anteriores para garantir um estado limpo.
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Membros podem ver colaboradores no mesmo projeto" ON public.collaborators;


-- 2. REMOVER AS FUNÇÕES AUXILIARES OBSOLETAS
-- Com todas as dependências removidas, estes comandos agora serão executados com sucesso.
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);


-- 3. RECRIAR TODAS AS POLÍTICAS DE FORMA SEGURA E NÃO-RECURSIVA

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
);

-- Para 'tasks'
CREATE POLICY "Membros podem gerenciar tarefas de seus projetos" ON public.tasks
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid())
);

-- Para 'collaborators'
CREATE POLICY "Membros podem ver colaboradores no mesmo projeto" ON public.collaborators
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar colaboradores" ON public.collaborators
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
);

-- Para tabelas relacionadas
CREATE POLICY "Membros podem acessar dependências de tarefas" ON public.task_dependencies
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM tasks t JOIN collaborators c ON t.project_id = c.project_id WHERE t.id = task_dependencies.task_id AND c.user_id = auth.uid())
);
CREATE POLICY "Membros podem acessar histórico de mudanças" ON public.change_history
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM collaborators WHERE collaborators.project_id = change_history.project_id AND collaborators.user_id = auth.uid())
);
CREATE POLICY "Membros podem acessar baselines" ON public.baselines
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM tasks t JOIN collaborators c ON t.project_id = c.project_id WHERE t.id = baselines.task_id AND c.user_id = auth.uid())
);

-- Supondo que a tabela 'replan_history' tem uma coluna 'project_id'
CREATE POLICY "Membros podem acessar histórico de replanejamento" ON public.replan_history
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM collaborators WHERE collaborators.project_id = replan_history.project_id AND collaborators.user_id = auth.uid())
);
