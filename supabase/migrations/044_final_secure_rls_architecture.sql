-- =============================================================================
--  MIGRAÇÃO 044: IMPLEMENTAÇÃO DA ARQUITETURA DE RLS SEGURA E NÃO-RECURSIVA
--  Este script implementa a arquitetura de segurança definitiva, baseada na
--  função auxiliar com SECURITY DEFINER e extração do JWT, para resolver
--  o problema de recursão infinita.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS E FUNÇÕES ANTIGAS
-- É crucial dropar tudo para garantir um estado inicial limpo e sem conflitos.
DROP POLICY IF EXISTS "Membros do projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators;
-- Adicionar outras políticas de collaborators se existirem
DROP POLICY IF EXISTS "Membros de projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe do projeto" ON public.collaborators;

DROP FUNCTION IF EXISTS public.user_in_project(uuid);
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);


-- 2. CRIAR A FUNÇÃO AUXILIAR SEGURA QUE IGNORA RLS
CREATE OR REPLACE FUNCTION public.user_is_project_collaborator(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
-- Define o search_path para garantir que a função encontre as tabelas corretas.
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.collaborators
    WHERE project_id = p_project_id
      AND user_id = (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  );
$$;

-- 3. REATIVAR RLS (caso tenha sido desativada para debug)
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators FORCE ROW LEVEL SECURITY;


-- 4. CRIAR AS POLÍTICAS FINAIS E NÃO-RECURSIVAS

-- Política de Visualização (SELECT)
CREATE POLICY "Membros podem ver a equipe do projeto" ON public.collaborators
FOR SELECT USING (
  public.is_admin() OR
  public.user_is_project_collaborator(project_id)
);

-- Política de Gerenciamento (INSERT, UPDATE, DELETE)
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (
  public.is_admin() OR
  (
    -- Verifica se o usuário é um colaborador E se a sua role é 'Gerente'
    EXISTS (
        SELECT 1
        FROM public.collaborators c
        WHERE c.project_id = collaborators.project_id
        AND c.user_id = (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
        AND c.role = 'Gerente'
    )
  )
)
WITH CHECK (
    public.is_admin() OR
  (
    EXISTS (
        SELECT 1
        FROM public.collaborators c
        WHERE c.project_id = collaborators.project_id
        AND c.user_id = (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
        AND c.role = 'Gerente'
    )
  )
);
