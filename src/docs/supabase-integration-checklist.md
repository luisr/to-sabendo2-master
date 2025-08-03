# Checklist de Integração com Supabase

Este checklist acompanha o processo de integração completa da aplicação com o backend do Supabase.

## Fase 1: Configuração Inicial e Estrutura do BD

-   [x] Configurar cliente Supabase e variáveis de ambiente.
-   [x] Implementar login e autenticação.
-   [x] Criar `supabase/schema.sql` e adotar sistema de **migrações**.
-   [x] Implementar políticas de RLS seguras com `SECURITY DEFINER`.
-   [x] Implementar Trigger (`handle_new_user`) para sincronização de usuários.

## Fase 2: Funções de Backend (RPC & Edge Functions)

-   [x] **Edge Functions:**
    -   [x] `create-user`: Para criação de novos usuários pelo Admin.
    -   [x] `delete-user`: Para exclusão segura de usuários pelo Admin.
-   [x] **Funções RPC:**
    -   [x] Funções para dashboards (`get_consolidated_kpis`, `get_manager_kpis`).
    -   [x] Função para o calendário (`get_calendar_tasks`).
    -   [x] Função para projetos do gerente (`get_managed_projects`).
    -   [x] Função para salvar preferências (`upsert_dashboard_preferences`).
    -   [x] Função para aplicar replanejamento (`apply_replan_changes`).

## Fase 3: Conexão do Frontend e Funcionalidades

-   [x] **Gerenciamento de Usuários (Admin):**
    -   [x] Interface completa para criar, visualizar, editar e excluir usuários.
-   [x] **Gerenciamento de Projetos (Gerente):**
    -   [x] Ciclo de vida completo: Criar, Editar, Excluir, Baixar (CSV).
    -   [x] Importação de dados: Criar projeto de CSV ou adicionar tarefas a um projeto existente.
    -   [x] Gerenciamento de equipe (adicionar/remover colaboradores).
-   [x] **Inteligência Artificial (Genkit):**
    -   [x] **Replanejamento Inteligente**: Flow `replanAssistantFlow` para analisar planos e sugerir alterações.
    -   [x] **Criação Assistida**: Flow para sugerir tarefas na criação de projetos.
-   [x] **Visualizações:**
    -   [x] Calendário moderno e responsivo.
    -   [x] Dashboards consolidados e **personalizáveis** para Admin e Gerente.
    -   [x] Gráfico de Gantt interativo com **drag-and-drop**.
-   [x] **Hooks de Dados Centralizados**: `useTasks`, `useProjects`, `useUsers`, etc., encapsulam toda a lógica de dados.

## Fase 4: Estabilização e Documentação

-   [x] Resolvidos os principais bugs de permissão, renderização e busca de dados.
-   [x] **Documentação Atualizada:**
    -   [x] `README.md`
    -   [x] `blueprint.md`
    -   [x] `supabase-integration-checklist.md`
    -   [x] `api-collection.md` (refletindo a arquitetura com RPC e Edge Functions).

---
O projeto está agora em um estado funcionalmente rico e estável.
