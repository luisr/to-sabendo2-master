-- =============================================================================
--  SCHEMA DO BANCO DE DADOS - PROJETO "TO SABENDO"
--  Este arquivo contém a estrutura final e consolidada de todas as tabelas.
--  Para setup inicial, execute este arquivo, seguido por functions.sql e rls.sql.
-- =============================================================================

-- 1. HABILITAR EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CRIAR TIPOS ENUM
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('Admin', 'Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('Baixa', 'Média', 'Alta', 'Urgente'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.collaborator_role AS ENUM ('Gerente', 'Membro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.custom_column_type AS ENUM ('texto', 'numero', 'data', 'formula'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. CRIAR TABELAS NA ORDEM DE DEPENDÊNCIA

CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    email text UNIQUE,
    avatar text,
    role user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    budget numeric(12, 2) DEFAULT 0.00,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_is_positive CHECK (budget >= 0)
);

CREATE TABLE IF NOT EXISTS public.collaborators (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role collaborator_role NOT NULL DEFAULT 'Membro',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_statuses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    color text DEFAULT '#808080',
    display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    color text DEFAULT '#cccccc'
);

CREATE TABLE IF NOT EXISTS public.custom_columns (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    type custom_column_type NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    priority task_priority DEFAULT 'Média' NOT NULL,
    start_date date,
    end_date date,
    progress integer DEFAULT 0 NOT NULL,
    wbs_code text,
    dependencies uuid[],
    parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, name),
    CONSTRAINT progress_between_0_and_100 CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.change_history (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    change_description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
