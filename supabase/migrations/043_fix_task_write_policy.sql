-- =============================================================================
--  MIGRAÇÃO 043: CORREÇÃO DA POLÍTICA DE ESCRITA DE TAREFAS (WITH CHECK)
--  Este script corrige a política de gerenciamento de tarefas, adicionando a
--  cláusula WITH CHECK, que é essencial para permissões de INSERT e UPDATE.
-- =============================================================================

-- 1. REMOVER A POLÍTICA DE GERENCIAMENTO INCOMPLETA
DROP POLICY IF EXISTS "Gerentes e Admins podem gerenciar todas as tarefas do projeto" ON public.tasks;

-- 2. RECRIAR A POLÍTICA COM A CLÁUSULA WITH CHECK
-- A cláusula USING aplica-se a SELECT, UPDATE, DELETE.
-- A cláusula WITH CHECK aplica-se a INSERT, UPDATE.
-- Para uma política FOR ALL, ambas devem ser idênticas para um comportamento consistente.
CREATE POLICY "Gerentes e Admins podem gerenciar totalmente as tarefas" ON public.tasks
FOR ALL
USING (
    public.is_admin() OR public.is_project_manager(project_id)
)
WITH CHECK (
    public.is_admin() OR public.is_project_manager(project_id)
);
