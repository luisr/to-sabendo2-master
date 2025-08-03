-- =============================================================================
--  MIGRAÇÃO 046: RECONSTRUÇÃO ARQUITETURAL FINAL E DEFINITIVA DA RLS (ORDEM CORRETA)
--  Este script limpa TODAS as políticas dependentes, remove as funções
--  problemáticas, e recria a arquitetura de segurança do zero.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELACIONADAS PARA QUEBRAR DEPENDÊNCIAS
-- É crucial dropar todas as políticas que usam as funções antes de dropar as funções.
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;

DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;

-- 2. REMOVER AS FUNÇÕES AUXILIARES AGORA QUE NÃO HÁ MAIS DEPENDÊNCIAS
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);

-- 3. RECRIAR FUNÇÕES AUXILIARES COM O CONTEXTO DE SEGURANÇA CORRETO
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

-- 4. RECRIAR POLÍTICAS GRANULARES E SEGURAS

-- Para 'projects'
CREATE POLICY "Membros podem ver projetos" ON public.projects
FOR SELECT USING (public.is_admin() OR public.is_project_member(id));
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (public.is_admin() OR public.is_project_manager(id));

-- Para 'tasks'
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (public.is_admin() OR public.is_project_member(project_id));
CREATE POLICY "Qualquer colaborador pode editar tarefas pelas quais é responsável" ON public.tasks
FOR UPDATE USING (public.is_admin() OR (public.is_project_member(project_id) AND assignee_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));

-- Para 'collaborators' (com subconsulta não-recursiva)
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));
