-- =============================================================================
--  MIGRAÇÃO 020: CORRIGIR POLÍTICAS DE RLS DA TABELA DE TAREFAS
--  Este script substitui as políticas de segurança da tabela `tasks` que
--  usavam funções auxiliares defeituosas por uma política direta e robusta.
-- =============================================================================

-- 1. Remover as políticas antigas que dependiam das funções `is_project_member`.
DROP POLICY IF EXISTS "Membros do projeto podem ver as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros do projeto podem criar e editar tarefas" ON public.tasks;

-- 2. Criar uma nova política unificada e segura.
-- Esta política concede permissão total (SELECT, INSERT, UPDATE, DELETE) em uma tarefa
-- se o ID do usuário autenticado (auth.uid()) existir na tabela de colaboradores
-- para o projeto ao qual a tarefa pertence (tasks.project_id).
-- Esta abordagem é mais segura e evita os problemas de contexto de `SECURITY DEFINER`.

CREATE POLICY "Colaboradores podem gerenciar tarefas nos seus projetos"
ON public.tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.collaborators
    WHERE collaborators.project_id = tasks.project_id
      AND collaborators.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.collaborators
    WHERE collaborators.project_id = tasks.project_id
      AND collaborators.user_id = auth.uid()
  )
);
