-- =============================================================================
--  MIGRAÇÃO 048: ADICIONAR TIPO 'FORMULA' PARA COLUNAS CUSTOMIZADAS
--  Este script adiciona o valor 'formula' ao tipo ENUM custom_column_type.
-- =============================================================================

-- Adicionar o novo valor ao ENUM. A cláusula IF NOT EXISTS previne erros
-- se o tipo já tiver sido adicionado manualmente.
DO $$
BEGIN
    ALTER TYPE public.custom_column_type ADD VALUE IF NOT EXISTS 'formula';
EXCEPTION
    WHEN duplicate_object THEN
        -- O tipo já existe, não fazer nada.
        null;
END $$;
