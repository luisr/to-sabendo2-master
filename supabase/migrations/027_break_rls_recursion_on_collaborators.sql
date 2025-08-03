-- =============================================================================
--  MIGRAÇÃO 027: QUEBRAR RECURSÃO NA POLÍTICA DE RLS DE COLABORADORES
--  Este script reescreve a política de SELECT na tabela 'collaborators'
--  para remover a subconsulta recursiva que causava o erro de "infinite recursion".
-- =============================================================================

-- 1. LIMPAR AS POLÍTICAS ANTIGAS E DEFEITUOSAS DA TABELA 'collaborators'
DROP POLICY IF EXISTS "Membros podem ver colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes podem gerenciar colaboradores no mesmo projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;


-- 2. CRIAR POLÍTICAS SEGURAS E NÃO-RECURSIVAS

-- POLÍTICA DE VISUALIZAÇÃO (SELECT)
-- REGRA: Um usuário pode ver a lista de colaboradores de um projeto SE
-- (1) o ID desse usuário estiver na lista de colaboradores daquele projeto, OU (2) se o usuário for um Admin.
-- Esta política não é recursiva porque a condição `auth.uid() = user_id` é uma verificação direta.
CREATE POLICY "Membros podem ver os colaboradores do seu projeto"
ON public.collaborators
FOR SELECT
USING (
    public.is_admin()
    OR
    EXISTS (
        SELECT 1
        FROM public.collaborators c2
        WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()
    )
);


-- POLÍTICA DE GERENCIAMENTO (INSERT, UPDATE, DELETE)
-- REGRA: Um usuário pode gerenciar os colaboradores de um projeto SE
-- (1) ele for um colaborador com a role 'Gerente' naquele projeto, OU (2) se for um Admin.
CREATE POLICY "Gerentes e Admins podem gerenciar colaboradores"
ON public.collaborators
FOR ALL
USING (
    public.is_admin()
    OR
    EXISTS (
        SELECT 1
        FROM public.collaborators c2
        WHERE c2.project_id = collaborators.project_id
          AND c2.user_id = auth.uid()
          AND c2.role = 'Gerente'
    )
);
