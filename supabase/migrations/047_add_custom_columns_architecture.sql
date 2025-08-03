-- =============================================================================
--  MIGRAÇÃO 047: ARQUITETURA PARA COLUNAS CUSTOMIZADAS
--  Este script adiciona as tabelas e colunas necessárias para suportar
--  colunas customizadas de diferentes tipos (texto, número, data) por projeto.
-- =============================================================================

-- 1. CRIAR O TIPO ENUM PARA OS TIPOS DE COLUNA
DO $$ BEGIN
    CREATE TYPE public.custom_column_type AS ENUM ('texto', 'numero', 'data');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 2. CRIAR A TABELA PARA DEFINIR AS COLUNAS CUSTOMIZADAS
-- Cada linha representa uma coluna que um gerente pode criar para um projeto.
CREATE TABLE IF NOT EXISTS public.custom_columns (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    type custom_column_type NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, name)
);


-- 3. ADICIONAR A COLUNA JSONB NA TABELA DE TAREFAS
-- Esta coluna irá armazenar os dados das colunas customizadas para cada tarefa.
-- Ex: { "column_id_abc": "algum texto", "column_id_xyz": 12345 }
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;


-- 4. ADICIONAR POLÍTICAS DE SEGURANÇA (RLS) PARA A NOVA TABELA
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem ver as definições de colunas de seus projetos"
ON public.custom_columns
FOR SELECT USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = custom_columns.project_id AND collaborators.user_id = auth.uid())
);

CREATE POLICY "Gerentes e Admins podem gerenciar colunas customizadas"
ON public.custom_columns
FOR ALL USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.collaborators WHERE collaborators.project_id = custom_columns.project_id AND collaborators.user_id = auth.uid() AND collaborators.role = 'Gerente')
);
