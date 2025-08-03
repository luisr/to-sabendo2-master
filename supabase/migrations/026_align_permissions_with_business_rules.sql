-- =============================================================================
--  MIGRAÇÃO 026: ALINHAMENTO FINAL DAS PERMISSÕES COM AS REGRAS DE NEGÓCIO
--  Este script reescreve as políticas de RLS para garantir que Admins e
--  Gerentes tenham os privilégios corretos, conforme a documentação.
-- =============================================================================

-- 1. POLÍTICAS PARA A TABELA 'tasks'
--    REGRA: Um usuário pode gerenciar uma tarefa SE for colaborador no projeto OU for um Admin.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Colaboradores podem gerenciar tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as tarefas" ON public.tasks;

CREATE POLICY "Usuários podem gerenciar tarefas com base na sua permissão"
ON public.tasks
FOR ALL
USING (
  public.is_admin() -- Admins podem tudo
  OR
  EXISTS ( -- Colaboradores podem gerenciar tarefas do projeto
    SELECT 1
    FROM public.collaborators
    WHERE collaborators.project_id = tasks.project_id
      AND collaborators.user_id = auth.uid()
  )
);


-- 2. POLÍTICAS PARA A TABELA 'collaborators'
--    REGRA: Um usuário pode gerenciar colaboradores SE for Gerente no projeto OU for um Admin.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Membros podem ver colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes podem gerenciar colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;

-- Política de Visualização
CREATE POLICY "Membros de projeto podem ver outros colaboradores"
ON public.collaborators
FOR SELECT
USING (
    public.is_admin() -- Admins podem ver todos
    OR
    EXISTS ( -- Membros podem ver colaboradores no mesmo projeto
        SELECT 1
        FROM public.collaborators c2
        WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()
    )
);

-- Política de Gerenciamento (INSERT, UPDATE, DELETE)
CREATE POLICY "Gerentes e Admins podem gerenciar colaboradores"
ON public.collaborators
FOR ALL
USING (
    public.is_admin() -- Admins podem tudo
    OR
    EXISTS ( -- Gerentes podem gerenciar colaboradores no seu projeto
        SELECT 1
        FROM public.collaborators c2
        WHERE c2.project_id = collaborators.project_id
          AND c2.user_id = auth.uid()
          AND c2.role = 'Gerente'
    )
);


-- 3. POLÍTICAS PARA A TABELA 'task_statuses'
--    REGRA: Apenas Admins e Gerentes podem gerenciar status.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins e Gerentes podem gerenciar status" ON public.task_statuses;
DROP POLICY IF EXISTS "Usuários autenticados podem ver status, etc." ON public.task_statuses;
DROP POLICY IF EXISTS "Admins podem gerenciar status, etc." ON public.task_statuses;


-- Política de Visualização para todos
CREATE POLICY "Usuários autenticados podem ver os status"
ON public.task_statuses
FOR SELECT
USING (auth.role() = 'authenticated');

-- Política de Gerenciamento para Admins e Gerentes
CREATE POLICY "Admins e Gerentes podem gerenciar os status"
ON public.task_statuses
FOR ALL
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
)
WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Admin'::user_role, 'Gerente'::user_role)
);
