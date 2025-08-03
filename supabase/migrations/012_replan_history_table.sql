-- =============================================================================
--  MIGRAÇÃO 012: CRIAR TABELA DE HISTÓRICO DE REPLANEJAMENTO
--  Este script cria a tabela `replan_history` para armazenar um log
--  de todas as operações de replanejamento inteligente.
-- =============================================================================

CREATE TABLE public.replan_history (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    observation text,
    changes jsonb NOT NULL
);

-- Habilitar RLS e criar políticas básicas de segurança
ALTER TABLE public.replan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gerentes podem ver o histórico do seus projetos"
ON public.replan_history FOR SELECT
USING (is_project_manager(project_id));

CREATE POLICY "Admins podem ver todo o histórico"
ON public.replan_history FOR SELECT
USING (is_admin());
