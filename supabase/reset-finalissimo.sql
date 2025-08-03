-- = a===========================================================================
-- PROJETO: TO SABENDO
-- SCRIPT DE RESET FINALÍSSIMO - DIAGNÓSTICO FINAL PARA COLLABORATORS
-- =============================================================================

-- =============================================================================
-- ETAPA 1: REMOÇÃO COMPLETA E EM CASCATA
-- =============================================================================
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_manager(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.uid_safe() CASCADE;

-- =============================================================================
-- ETAPA 2: LIMPEZA MANUAL DE QUALQUER POLÍTICA "ÓRFÃ"
-- =============================================================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Membros podem ver projetos dos quais participam" ON public.projects;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os projetos" ON public.projects;
DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros do projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes podem gerenciar colaboradores do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os colaboradores" ON public.collaborators;
DROP POLICY IF EXISTS "Membros podem ver colunas personalizadas de seus projetos" ON public.custom_columns;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as colunas personalizadas" ON public.custom_columns;
DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Qualquer autenticado vê tags" ON public.tags;
DROP POLICY IF EXISTS "Qualquer autenticado vê task_tags" ON public.task_tags;
DROP POLICY IF EXISTS "Membros veem histórico do projeto" ON public.change_history;

-- =============================================================================
-- ETAPA 3: RECRIAR FUNÇÕES SEGURAS (COM PROTEÇÃO ANTI-RECURSÃO)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.uid_safe()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
$$;
GRANT EXECUTE ON FUNCTION public.uid_safe() TO PUBLIC;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = public.uid_safe() AND role = 'Admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (SELECT 1 FROM public.collaborators WHERE project_id = p_project_id AND user_id = public.uid_safe());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (SELECT 1 FROM public.collaborators WHERE project_id = p_project_id AND user_id = public.uid_safe() AND role = 'Gerente');
END;
$$;

-- =============================================================================
-- ETAPA 4: RECRIAR POLÍTICAS DE RLS (COM DIAGNÓSTICO)
-- =============================================================================

-- Tabela: collaborators (DIAGNÓSTICO FINAL)
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
  FOR SELECT USING (true); -- Política simplificada para diagnóstico

CREATE POLICY "Gerentes podem gerenciar colaboradores do projeto" ON public.collaborators
  FOR ALL USING (public.is_project_manager(collaborators.project_id));

CREATE POLICY "Admins podem gerenciar todos os colaboradores" ON public.collaborators
  FOR ALL USING (public.is_admin());

-- Outras Tabelas
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.users FOR ALL USING (public.uid_safe() = id);
CREATE POLICY "Admins podem ver todos os usuários" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "Membros podem ver projetos dos quais participam" ON public.projects FOR SELECT USING (public.is_project_member(id));
CREATE POLICY "Admins podem gerenciar todos os projetos" ON public.projects FOR ALL USING (public.is_admin());
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Admins podem gerenciar todas as tarefas" ON public.tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Membros podem ver colunas personalizadas de seus projetos" ON public.custom_columns FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Admins podem gerenciar todas as colunas personalizadas" ON public.custom_columns FOR ALL USING (public.is_admin());
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Qualquer autenticado vê tags" ON public.tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Qualquer autenticado vê task_tags" ON public.task_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Membros veem histórico do projeto" ON public.change_history FOR SELECT USING (public.is_project_member(project_id));
