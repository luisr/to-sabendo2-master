# Checklist de Integração com Supabase

Este checklist acompanha o processo de integração completa da aplicação com o backend do Supabase.

## Fase 1: Configuração Inicial

-   [x] Instalar `@supabase/supabase-js`.
-   [x] Configurar variáveis de ambiente (`.env.local`).
-   [x] Criar cliente Supabase em `src/lib/supabase.ts`.
-   [x] Implementar login do usuário.

## Fase 2: Estrutura do Banco de Dados

-   [x] Criar `supabase/schema.sql` com todas as tabelas, tipos e relações.
-   [x] Implementar políticas de Row Level Security (RLS) para todas as tabelas.
-   [x] **(Concluído)** Refatorar RLS para usar funções auxiliares seguras (ex: `is_admin`, `is_project_member`).
-   [x] **(REMOVIDO)** ~~Adicionar Trigger para criação automática de perfis de usuário.~~
    -   *Nota: A criação de perfis agora é gerenciada exclusivamente pela Edge Function `create-user` para evitar conflitos e centralizar a lógica.*
-   [x] Criar `supabase/seed.sql` para popular o banco de dados.
-   [x] **(Concluído)** Adicionar tabela `user_dashboard_preferences`.
-   [x] **(Concluído)** Adicionar tabela `baselines` para o Gráfico de Gantt.

## Fase 3: Conexão do Frontend e Funcionalidades

-   [x] **(Concluído)** Refatorar para usar hooks centralizados (`useTasks`, `useProjects`, `useUsers`).
-   [x] **(Concluído)** Conectar todas as páginas e visões aos hooks.
-   [x] **(Concluído)** Implementar criação de usuários pelo Admin via **Edge Function**.
-   [x] **(Concluído)** Implementar **Edição em Linha** na `TableView`.
-   [x] **(Concluído)** Implementar **Exportação para CSV**.
-   [x] **(Concluído)** Implementar **Linhas de Base (Baselines)** no Gráfico de Gantt.
-   [x] **(Concluído)** Implementar **Gerenciamento de Status**.
-   [x] **(Concluído)** Conectar as Ferramentas de IA aos dados em tempo real.
-   [x] **(Concluído)** Conectar a Visão de Calendário aos dados em tempo real.
-   [x] **(Concluído)** Implementar persistência das preferências do Dashboard.

## Fase 4: Depuração e Estabilização

-   [x] Resolução de erros de `Invalid login credentials`, `map of undefined`, `stack depth limit exceeded`.
-   [x] **(Concluído)** Resolução de erro de **recursão infinita** nas políticas de RLS.
-   [x] **(Concluído)** Resolução de erro de **chave estrangeira** no `seed.sql`.
-   [x] Resolução de problemas de responsividade e layout.

## Fase 5: Documentação

-   [x] Atualizar o `README.md`.
-   [x] Atualizar o `api-collection.md`.
-   [x] Atualizar o `INTERACOES.md`.
-   [x] Atualizar o `REFACTORING_NEXT_STEPS.md`.
-   [x] Verificar se o `blueprint.md` está alinhado com a implementação.
