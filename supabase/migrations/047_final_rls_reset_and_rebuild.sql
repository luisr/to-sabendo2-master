-- =============================================================================
--  MIGRAÇÃO 047: RECONSTRUÇÃO ARQUITETURAL FINAL E DEFINITIVA DA RLS (ORDEM CORRETA)
--  Este script desabilita a RLS, limpa TODAS as políticas e funções, e recria a
--  arquitetura de segurança do zero para um estado funcional e seguro.
-- =============================================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE PARA PERMITIR A LIMPEZA
-- Isso nos permite remover políticas e funções sem erros de dependência.
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators DISABLE ROW LEVEL SECURITY;


-- 2. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS E FUNÇÕES ANTIGAS
-- Com a RLS desabilitada, podemos dropar tudo com segurança.
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;

DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;

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
CREATE POLICY "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks
FOR UPDATE USING (public.is_admin() OR (public.is_project_member(project_id) AND assignee_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));

-- Para 'collaborators' (com subconsulta não-recursiva)
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));


-- 5. REABILITAR A RLS COM AS NOVAS POLÍTICAS CORRETAS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Garante que a RLS seja obrigatória
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators FORCE ROW LEVEL SECURITY;
