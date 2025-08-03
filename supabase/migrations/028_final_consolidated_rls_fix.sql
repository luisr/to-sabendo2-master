-- =============================================================================
--  MIGRAÇÃO 028: SCRIPT CONSOLIDADO E FINAL PARA CORREÇÃO DE RLS
--  Este script limpa todas as políticas conflitantes das tabelas tasks e
--  collaborators e cria as políticas definitivas e não-recursivas.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DAS POLÍTICAS ANTIGAS E DEFEITUOSAS
DROP POLICY IF EXISTS "Membros do projeto podem gerenciar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Colaboradores podem gerenciar tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Usuários podem gerenciar tarefas com base na sua permissão" ON public.tasks;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes podem gerenciar colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Membros de projeto podem ver outros colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar colaboradores" ON public.collaborators;


-- 2. CRIAR POLÍTICAS FINAIS E SEGURAS

-- Para a tabela 'tasks'
CREATE POLICY "Usuários podem gerenciar tarefas com base na permissão"
ON public.tasks
FOR ALL
USING (
  public.is_admin() OR
  EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = tasks.project_id AND collaborators.user_id = auth.uid())
);

-- Para a tabela 'collaborators' (Visualização)
CREATE POLICY "Membros podem ver colaboradores no mesmo projeto"
ON public.collaborators
FOR SELECT
USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid())
);

-- Para a tabela 'collaborators' (Gerenciamento)
CREATE POLICY "Gerentes e Admins podem gerenciar colaboradores"
ON public.collaborators
FOR ALL
USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND c2.role = 'Gerente')
);


-- 3. REMOVER AS FUNÇÕES AUXILIARES OBSOLETAS
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);
