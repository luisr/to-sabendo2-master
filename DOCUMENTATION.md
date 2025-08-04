# Documentação Completa do Projeto: To Sabendo

Este documento é a fonte central de verdade para o projeto "To Sabendo", abrangendo desde a visão geral até os detalhes técnicos de implementação e segurança.

## 1. Visão Geral e Roteiro (Blueprint)

"To Sabendo" é uma aplicação full-stack de gestão de projetos construída com Next.js, TypeScript, Supabase e Genkit. O objetivo é fornecer uma ferramenta robusta, interativa e inteligente, com um sistema de permissões granular e seguro para diferentes perfis de usuário.

### Status do Projeto
O projeto atingiu um estágio maduro, com um conjunto robusto de funcionalidades e uma arquitetura de segurança não-recursiva no backend.

---

## 2. Funcionalidades por Perfil

### 2.1. Super Admin
O Super Admin tem controle total sobre o sistema e herda todas as permissões do Gerente.

-   **Gestão de Usuários Completa**: Criar, editar (nome, perfil, status) e remover usuários.
-   **Visão Global Irrestrita**: Acesso a todos os projetos, tarefas e dashboards.
-   **Controle e Backup**: Funcionalidades para criar e restaurar backups.

### 2.2. Gerente de Projeto
O Gerente tem acesso total aos projetos que gerencia.

-   **Painel de Controle (Dashboard)**: Visão consolidada ou por projeto, com KPIs e gráficos personalizáveis.
-   **Gerenciamento Completo de Projetos**: Criar, importar de CSV, editar, exportar e excluir projetos.
-   **Gerenciamento de Equipe**: Adicionar e remover membros de seus projetos.
-   **Tabela de Tarefas Interativa (WBS/EAP)**: Visualização hierárquica, filtros dinâmicos e seleção múltipla.
-   **Visualizações Alternativas**: Quadro Kanban (com drag-and-drop), Gráfico de Gantt e Calendário.
-   **Customização do Fluxo de Trabalho**: Gerenciar status, etiquetas (tags) e visibilidade de colunas.
-   **Ferramentas de IA**: Acesso a assistentes para criação de projetos, replanejamento e análise de riscos.

### 2.3. Membro da Equipe
O Membro tem uma visão focada na execução de suas tarefas.

-   **Acesso Restrito**: Visualiza apenas os projetos em que é colaborador.
-   **Visão "Minhas Tarefas"**: Página principal com as tarefas atribuídas e não concluídas.
-   **Edição Limitada**: Pode atualizar o status e o progresso apenas das tarefas que lhe foram atribuídas.

---

## 3. Arquitetura Técnica e Padrões

### 3.1. Acesso a Dados (Frontend <> Supabase)

-   **Consultas Diretas (Padrão)**: A maioria das operações usa a API padrão do Supabase, com a segurança garantida por RLS.
-   **Ações Privilegiadas (Edge Functions)**: Operações que exigem privilégios elevados (como criar um novo usuário no sistema de autenticação) são feitas via Edge Functions.
-   **Consultas Especiais (RPC)**: Usadas para consultas complexas ou para contornar a RLS de forma controlada (ex: `get_all_projects_for_admin`).

### 3.2. Arquitetura de Segurança (RLS - Row Level Security)

A segurança é garantida no nível do banco de dados para evitar vazamento de dados.

-   **Histórico de Problemas**: O desenvolvimento inicial sofreu com problemas de recursão infinita nas políticas de RLS. Por exemplo, uma política na tabela `tasks` que chamava uma função que lia a tabela `collaborators`, acionando a política de `collaborators` que, por sua vez, lia a mesma tabela novamente.
-   **Solução Arquitetural Implementada**:
    1.  **Limpeza Total**: A solução definitiva envolveu a remoção de todas as políticas antigas.
    2.  **Funções Auxiliares com `SECURITY DEFINER`**: Funções como `is_admin()` e `get_my_projects()` são definidas com `SECURITY DEFINER`, permitindo que elas leiam tabelas sem acionar as políticas de RLS dessas tabelas, quebrando o ciclo de recursão.
    3.  **Políticas Não-Recursivas**: Onde necessário (como na tabela `users`), as políticas usam subconsultas diretas para evitar chamar funções que poderiam levar a um loop.
-   **Resultado**: Uma arquitetura de segurança estável, não-recursiva e alinhada com as regras de negócio de cada perfil.

### 3.3. Gerenciamento de Estado no Frontend
-   **Hooks Centralizados**: `useTasks`, `useProjects`, e `useUsers` servem como provedores centrais que encapsulam toda a lógica de acesso a dados e gerenciamento de estado.

---

## 4. Checklist de Integração e Funcionalidades (Concluído)

-   **Configuração Inicial**: Conexão com Supabase e autenticação.
-   **Estrutura do Banco de Dados**: Schema, RLS e dados iniciais (`seed.sql`) implementados e consolidados.
-   **Conexão do Frontend**: Todas as páginas e funcionalidades estão conectadas aos hooks de dados.
-   **Depuração e Estabilização**: Resolvidos os principais bugs de RLS, chave estrangeira e estado da aplicação.

---

## 5. Próximos Passos de Refatoração (Planejado)

-   **Implementar Gerenciamento Centralizado de Etiquetas (Tags)**: Atualmente, as tags são texto livre. O plano é movê-las para uma tabela `public.tags` e gerenciá-las através de uma interface de admin.
-   **Implementar a Criação de Gráficos e KPIs Customizados**: A UI para adicionar novos widgets ao dashboard existe, mas a lógica de backend para salvar e renderizar esses widgets precisa ser implementada.
-   **Implementar Histórico de Alterações de Tarefas**: Criar uma tabela `public.task_history` e um modal para justificar alterações em datas de tarefas.

---

## 6. Visão Geral do Schema do Banco de Dados

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

```sql
CREATE TABLE public.users (
  id uuid NOT NULL,
  name text,
  email text UNIQUE,
  avatar text,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  budget numeric DEFAULT 0.00 CHECK (budget >= 0::numeric),
  start_date date,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.collaborators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'Membro'::collaborator_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT collaborators_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.task_statuses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#808080'::text,
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT task_statuses_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  color text,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  assignee_id uuid,
  status_id uuid,
  priority USER-DEFINED NOT NULL DEFAULT 'Média'::task_priority,
  start_date date,
  end_date date,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  wbs_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  observation text,
  dependencies text[],
  parent_id uuid,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_task FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON DELETE SET NULL,
  CONSTRAINT tasks_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.task_statuses(id) ON DELETE SET NULL
);

CREATE TABLE public.task_tags (
  task_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT task_tags_pkey PRIMARY KEY (task_id, tag_id),
  CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);

CREATE TABLE public.task_observations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text,
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_observations_pkey PRIMARY KEY (id),
  CONSTRAINT task_observations_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_observations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.custom_columns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_columns_pkey PRIMARY KEY (id),
  CONSTRAINT custom_columns_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

CREATE TABLE public.change_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid,
  change_description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT change_history_pkey PRIMARY KEY (id),
  CONSTRAINT change_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT change_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- As tabelas abaixo foram identificadas mas não estão no script de setup final.
-- Elas podem ser de versões antigas ou funcionalidades planejadas.

CREATE TABLE public.baselines (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT baselines_pkey PRIMARY KEY (id),
  CONSTRAINT baselines_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);

CREATE TABLE public.replan_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  observation text,
  changes jsonb NOT NULL,
  CONSTRAINT replan_history_pkey PRIMARY KEY (id),
  CONSTRAINT replan_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT replan_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

CREATE TABLE public.user_dashboard_preferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  widget_id text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  CONSTRAINT user_dashboard_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_dashboard_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

```
