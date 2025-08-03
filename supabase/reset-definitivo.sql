-- =============================================================================
-- PROJETO: TO SABENDO
-- SCRIPT DE RESET DEFINITIVO E ORDENADO PARA RESOLVER DEPENDÊNCIAS DE RLS
-- =============================================================================

-- =============================================================================
-- ETAPA 1: REMOVER TODAS AS POLÍTICAS (DEPENDENTES) PRIMEIRO
-- Isso quebra as dependências e permite que as funções sejam removidas.
-- =============================================================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os projetos" ON public.projects;
DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros do projeto podem ver a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes podem gerenciar colaboradores do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Qualquer autenticado vê tags" ON public.tags;
DROP POLICY IF EXISTS "Qualquer autenticado vê task_tags" ON public.task_tags;
DROP POLICY IF EXISTS "Membros veem colunas personalizadas" ON public.custom_columns;
DROP POLICY IF EXISTS "Membros veem histórico do projeto" ON public.change_history;

-- =============================================================================
-- ETAPA 2: REMOVER AS FUNÇÕES AUXILIARES (DEPENDÊNCIAS)
-- Agora que nenhuma política depende mais delas, este comando será bem-sucedido.
-- =============================================================================
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_manager(uuid);
DROP FUNCTION IF EXISTS public.uid_safe();

-- =============================================================================
-- ETAPA 3: RECRIAR FUNÇÕES SEGURAS (COM PROTEÇÃO ANTI-RECURSÃO)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.uid_safe() RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid; $$;
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
-- ETAPA 4: RECRIAR POLÍTICAS DE RLS DEFINITIVAS
-- =============================================================================

-- Tabela: users
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.users
  FOR ALL USING (public.uid_safe() = id);
CREATE POLICY "Admins podem ver todos os usuários" ON public.users
  FOR SELECT USING (public.is_admin());

-- Tabela: collaborators (A CHAVE DA SOLUÇÃO)
-- A política de SELECT para collaborators NÃO USA FUNÇÃO. Ela usa uma subconsulta direta para evitar o loop.
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.collaborators c2
    WHERE c2.user_id = public.uid_safe() AND c2.project_id = collaborators.project_id
  ));
CREATE POLICY "Gerentes podem gerenciar colaboradores do projeto" ON public.collaborators
  FOR ALL USING (public.is_project_manager(collaborators.project_id));
CREATE POLICY "Admins podem gerenciar todos os colaboradores" ON public.collaborators
  FOR ALL USING (public.is_admin());


-- Tabela: projects
CREATE POLICY "Membros podem ver projetos dos quais participam" ON public.projects
  FOR SELECT USING (public.is_project_member(id));
CREATE POLICY "Admins podem gerenciar todos os projetos" ON public.projects
  FOR ALL USING (public.is_admin());


-- Tabela: tasks
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
  FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Admins podem gerenciar todas as tarefas" ON public.tasks
  FOR ALL USING (public.is_admin());


-- Tabela: custom_columns
CREATE POLICY "Membros podem ver colunas personalizadas de seus projetos" ON public.custom_columns
  FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Admins podem gerenciar todas as colunas personalizadas" ON public.custom_columns
  FOR ALL USING (public.is_admin());

-- (Adicione outras políticas para outras tabelas conforme necessário)
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses FOR SELECT USING (auth.role() = 'authenticated');
