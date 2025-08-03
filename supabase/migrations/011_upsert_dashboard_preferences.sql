-- =============================================================================
--  MIGRAÇÃO 011: FUNÇÃO PARA SALVAR PREFERÊNCIAS DO DASHBOARD
--  Este script cria uma função RPC `upsert_dashboard_preferences` que
--  permite salvar (inserir ou atualizar) as preferências de visibilidade
--  dos widgets do dashboard para um usuário.
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_dashboard_preferences(preferences jsonb)
RETURNS void AS $$
BEGIN
    -- A função recebe um array de objetos JSON e o converte em linhas
    -- para a operação de upsert.
    INSERT INTO public.user_dashboard_preferences (user_id, widget_id, is_visible)
    SELECT
        auth.uid(),
        (pref->>'widget_id')::text,
        (pref->>'is_visible')::boolean
    FROM jsonb_array_elements(preferences) AS pref
    ON CONFLICT (user_id, widget_id) DO UPDATE
    SET is_visible = EXCLUDED.is_visible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
