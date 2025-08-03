-- =============================================================================
--  MIGRAÇÃO 042: RECONSTRUÇÃO FINAL DAS POLÍTICAS DE TAREFAS E STATUS
--  Este script limpa todas as políticas relacionadas e recria as permissões
--  corretas para Tarefas e Status, alinhando com as regras de negócio.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DAS POLÍTICAS DE TASKS E TASK_STATUSES
DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes podem gerenciar todas as tarefas do projeto" ON public.tasks;


DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar status" ON public.task_statuses;

-- 2. RECRIAR FUNÇÕES AUXILIARES COM SECURITY DEFINER (CHAVE CONTRA RECURSÃO)
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


-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS ALINHADAS COM A DOCUMENTAÇÃO

-- Para 'tasks':
-- REGRA 1: Membros podem ver todas as tarefas dos projetos em que estão.
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (public.is_admin() OR public.is_project_member(project_id));

-- REGRA 2: Membros podem ATUALIZAR apenas as tarefas que lhes são atribuídas.
CREATE POLICY "Membros podem atualizar suas próprias tarefas" ON public.tasks
FOR UPDATE USING (public.is_admin() OR (public.is_project_member(project_id) AND assignee_id = auth.uid()));

-- REGRA 3: Gerentes e Admins têm permissão total (incluindo criar e excluir).
CREATE POLICY "Gerentes e Admins podem gerenciar todas as tarefas do projeto" ON public.tasks
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id));


-- Para 'task_statuses' (Gerenciamento de Colunas):
-- REGRA 1: Qualquer usuário logado pode ver a lista de status.
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses
FOR SELECT USING (auth.role() = 'authenticated');

-- REGRA 2: Apenas Gerentes e Admins podem gerenciar (criar, editar, excluir) os status.
CREATE POLICY "Gerentes e Admins podem gerenciar status" ON public.task_statuses
FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
);
