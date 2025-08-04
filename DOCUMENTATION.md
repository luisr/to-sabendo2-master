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
