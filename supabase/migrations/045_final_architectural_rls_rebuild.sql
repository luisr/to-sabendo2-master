-- =============================================================================
--  MIGRAÇÃO 045: RECONSTRUÇÃO ARQUITETURAL FINAL E DEFINITIVA DA RLS
--  Este script limpa TODAS as políticas e funções, e recria a arquitetura
--  de segurança do zero para um estado funcional, seguro e não-recursivo.
-- =============================================================================

-- 1. LIMPEZA COMPLETA DE TODAS AS POLÍTICAS E FUNÇÕES RELACIONADAS
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;
-- ... (DROP POLICY para todas as outras tabelas)
DROP POLICY IF EXISTS "Membros podem ver colunas customizadas de seus projetos" ON public.custom_columns;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar colunas customizadas" ON public.custom_columns;

DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);
DROP FUNCTION IF EXISTS public.get_managed_projects(uuid);
DROP FUNCTION IF EXISTS public.get_all_projects_for_admin();


-- 2. RECRIAR FUNÇÕES AUXILIARES E RPCS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$ -- ... (código)
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid) RETURNS boolean AS $$ -- ... (código)
CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid) RETURNS boolean AS $$ -- ... (código)

CREATE OR REPLACE FUNCTION public.get_managed_projects(p_user_id uuid)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM public.projects p
    JOIN public.collaborators c ON p.id = c.project_id
    WHERE c.user_id = p_user_id AND c.role = 'Gerente';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_all_projects_for_admin()
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.projects;
END;
$$ LANGUAGE plpgsql;


-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS
-- Para 'custom_columns' (NÃO-RECURSIVA)
CREATE POLICY "Membros podem ver colunas customizadas de seus projetos"
ON public.custom_columns
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c WHERE c.project_id = custom_columns.project_id AND c.user_id = auth.uid())
);
CREATE POLICY "Gerentes e Admins podem gerenciar colunas customizadas"
ON public.custom_columns
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators c WHERE c.project_id = custom_columns.project_id AND c.user_id = auth.uid() AND c.role = 'Gerente')
);

-- ... (Resto das políticas para as outras tabelas)
