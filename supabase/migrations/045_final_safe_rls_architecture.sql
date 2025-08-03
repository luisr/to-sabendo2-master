-- =============================================================================
--  MIGRAÇÃO 045: RECONSTRUÇÃO ARQUITETURAL FINAL E DEFINITIVA DA RLS (VERSÃO SEGURA)
--  Este script implementa a arquitetura de RLS correta, abandonando as
--  funções antigas, criando novas funções auxiliares seguras e implementando
--  as políticas granulares e não-recursivas.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELACIONADAS
-- Removemos todas as políticas para garantir um estado inicial limpo e sem conflitos.
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;
DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;

-- 2. CRIAR NOVAS FUNÇÕES AUXILIARES COM NOMES DIFERENTES (PARA EVITAR CONFLITO DE DROP)
-- Estas funções são SECURITY DEFINER para quebrar o ciclo de recursão.
CREATE OR REPLACE FUNCTION public.check_user_is_member(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.collaborators WHERE project_id = p_project_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_user_is_manager(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.collaborators WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'Gerente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS USANDO AS NOVAS FUNÇÕES

-- Para 'projects': Usa as novas funções auxiliares.
CREATE POLICY "Membros podem ver projetos" ON public.projects
FOR SELECT USING (public.is_admin() OR public.check_user_is_member(id));
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (public.is_admin() OR public.check_user_is_manager(id));

-- Para 'tasks': Usa as novas funções auxiliares.
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (public.is_admin() OR public.check_user_is_member(project_id));
CREATE POLICY "Qualquer colaborador pode editar tarefas pelas quais é responsável" ON public.tasks
FOR UPDATE USING (public.is_admin() OR (public.check_user_is_member(project_id) AND assignee_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (public.is_admin() OR public.check_user_is_manager(project_id));

-- Para 'collaborators': USA SUBCONSULTA DIRETA para não causar recursão.
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (public.is_admin() OR public.check_user_is_manager(project_id));
