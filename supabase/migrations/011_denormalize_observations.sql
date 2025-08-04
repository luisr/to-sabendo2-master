-- =============================================================================
--  MIGRAÇÃO DE DENORMALIZAÇÃO DAS OBSERVAÇÕES (V16)
--  Este script adiciona os campos user_name e user_avatar_url à tabela
--  de observações para simplificar as leituras e preservar o histórico.
-- =============================================================================

-- ========= PART 1: ADICIONAR AS NOVAS COLUNAS À TABELA =========
ALTER TABLE public.task_observations
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;

-- ========= PART 2: REMOVER A FUNÇÃO RPC ANTIGA (NÃO MAIS NECESSÁRIA) =========
-- Como agora salvamos os dados diretamente, a função get_observations_for_task
-- torna-se desnecessária e pode ser removida para manter a base de dados limpa.
DROP FUNCTION IF EXISTS public.get_observations_for_task(uuid);


SELECT 'MIGRATION 011_denormalize_observations.sql (V16) APPLIED SUCCESSFULLY!';
