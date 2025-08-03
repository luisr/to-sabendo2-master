-- =============================================================================
--  MIGRAÇÃO 044: ADICIONAR SUPORTE A DEPENDÊNCIAS E SUBTAREFAS
--  Este script adiciona as colunas 'dependencies' e 'parent_id' à tabela de
--  tarefas para alinhar o schema com as funcionalidades de front-end.
-- =============================================================================

-- Adicionar a coluna 'dependencies' se ela não existir.
-- Será um array de UUIDs, representando os IDs das tarefas das quais esta tarefa depende.
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS dependencies uuid[];

-- Adicionar a coluna 'parent_id' se ela não existir.
-- Isso cria uma auto-referência para suportar a hierarquia de tarefas (subtarefas).
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS parent_id uuid,
ADD CONSTRAINT fk_parent_task
    FOREIGN KEY (parent_id)
    REFERENCES public.tasks(id)
    ON DELETE SET NULL; -- Se a tarefa pai for deletada, a subtarefa se torna uma tarefa principal
