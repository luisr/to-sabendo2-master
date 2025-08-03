-- =============================================================================
--  MIGRAÇÃO 013: ADICIONAR CAMPO DE OBSERVAÇÃO ÀS TAREFAS
--  Este script adiciona uma coluna `observation` à tabela `tasks` para
--  armazenar notas sobre replanejamentos ou outras mudanças.
-- =============================================================================

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS observation text;
