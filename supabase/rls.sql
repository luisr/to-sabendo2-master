-- =============================================================================
--  POLÍTICAS DE SEGURANÇA (RLS) - PROJETO "TO SABENDO"
--  Este arquivo contém a arquitetura final e consolidada de todas as
--  políticas de segurança. Execute após o schema.sql e functions.sql.
-- =============================================================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS RELEVANTES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;


-- 2. LIMPAR POLÍTICAS ANTIGAS PARA GARANTIR UM ESTADO LIMPO
-- Removendo políticas de todas as tabelas que serão recriadas.
DROP POLICY IF EXISTS "Usuários podem acessar seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os usuários" ON public.users;

DROP POLICY IF EXISTS "Membros podem ver projetos" ON public.projects;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar projetos" ON public.projects;

DROP POLICY IF EXISTS "Membros podem ver tarefas de seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros podem atualizar tarefas atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks;

DROP POLICY IF EXISTS "Membros podem ver a equipe do projeto" ON public.collaborators;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators;

DROP POLICY IF EXISTS "Usuários autenticados podem ver os status" ON public.task_statuses;
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar status" ON public.task_statuses;

-- Adicione drops para outras tabelas se necessário (tags, etc.)


-- 3. RECRIAR POLÍTICAS GRANULARES E SEGURAS

-- Para 'users'
CREATE POLICY "Usuários podem ver e editar seus próprios dados" ON public.users
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- REMOVIDA TEMPORARIAMENTE: CREATE POLICY "Admins podem gerenciar todos os usuários" ON public.users
-- FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Para 'projects'
CREATE POLICY "Membros podem ver projetos" ON public.projects
FOR SELECT USING (public.is_admin() OR public.is_project_member(id));
CREATE POLICY "Gerentes e Admins podem gerenciar projetos" ON public.projects
FOR ALL USING (public.is_admin() OR public.is_project_manager(id)) WITH CHECK (public.is_admin() OR public.is_project_manager(id));

-- Para 'tasks'
CREATE POLICY "Membros podem ver tarefas de seus projetos" ON public.tasks
FOR SELECT USING (public.is_admin() OR public.is_project_member(project_id));
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL USING (public.is_admin() OR public.is_project_manager(project_id)) WITH CHECK (public.is_admin() OR public.is_project_manager(project_id));

-- Para 'collaborators' (Não-Recursiva)
CREATE POLICY "Membros do projeto podem ver a equipe" ON public.collaborators
FOR SELECT USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid()));
CREATE POLICY "Gerentes e Admins podem gerenciar a equipe" ON public.collaborators
FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND public.get_user_role() = 'Gerente'))
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.collaborators c2 WHERE c2.project_id = collaborators.project_id AND c2.user_id = auth.uid() AND public.get_user_role() = 'Gerente'));

-- Para 'task_statuses'
CREATE POLICY "Usuários autenticados podem ver os status" ON public.task_statuses
FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gerentes e Admins podem gerenciar status" ON public.task_statuses
FOR ALL USING (public.is_admin() OR public.get_user_role() = 'Gerente')
WITH CHECK (public.is_admin() OR public.get_user_role() = 'Gerente');