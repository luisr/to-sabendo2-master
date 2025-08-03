# Documentação do Projeto: To Sabendo

Este documento descreve as principais funcionalidades implementadas na aplicação de gerenciamento de projetos "To Sabendo", divididas por perfil de usuário.

## 1. Visão do Super Admin

O Super Admin tem controle total sobre o sistema e herda todas as permissões do Gerente. Suas funcionalidades exclusivas são:

-   **Gestão de Usuários Completa**: Permite criar, editar (nome, perfil, status) e remover usuários diretamente da interface da aplicação.
-   **Visão Global Irrestrita**: Acesso a todos os projetos, tarefas e dashboards do sistema, independentemente de ser um colaborador.
-   **Controle e Backup**: Funcionalidades para criar e restaurar backups dos dados do Supabase.

## 2. Visão do Gerente de Projeto

O Gerente tem acesso total aos projetos que gerencia e é o perfil com o maior número de funcionalidades de customização.

### Funcionalidades Principais:

-   **Painel de Controle (Dashboard)**: Visão consolidada ou por projeto, com KPIs (Orçamento, Tarefas Concluídas, Risco) e gráficos. A visibilidade dos widgets é personalizável.
-   **Gerenciamento Completo de Projetos**: Criar, importar de CSV, editar, exportar e excluir projetos.
-   **Gerenciamento de Equipe**: Adicionar e remover membros de seus projetos.
-   **Tabela de Tarefas Interativa (WBS/EAP)**:
    *   **Visualização Hierárquica**: Renderiza tarefas e subtarefas com indentação e controles para expandir/recolher.
    *   **Filtros Dinâmicos**: Permite filtrar a visualização por nome da tarefa e etiquetas (tags).
    *   **Seleção Múltipla**: Permite selecionar várias tarefas para realizar ações em massa, como a exclusão.
-   **Visualização Kanban**: Quadro interativo onde as tarefas podem ser arrastadas e soltas entre colunas para alterar seu status.
-   **Visualização Gantt**: Gráfico de Gantt (baseado em `frappe-gantt-react`) que exibe a linha do tempo das tarefas e suas dependências. O sistema está preparado para a futura implementação de linhas de base (baselines).
-   **Gerenciamento do Fluxo de Trabalho (via Modal "Gerenciar Tabela")**:
    *   **Customização de Status**: Criar, renomear, alterar a cor e excluir os status que compõem as colunas do Kanban.
    *   **Customização de Etiquetas (Tags)**: Criar, renomear, alterar a cor e excluir as tags usadas no projeto.
    *   **Controle de Visibilidade de Colunas**: Escolher quais colunas são exibidas na tabela principal.
-   **Ferramentas de IA**: Acesso aos assistentes de IA para criação de projetos, replanejamento e previsão de riscos.

## 3. Visão do Membro da Equipe

O Membro tem uma visão focada na execução de suas tarefas, com permissões limitadas para garantir a integridade dos dados.

-   **Acesso Restrito**: Visualiza **apenas** os projetos nos quais foi adicionado como colaborador.
-   **Visão "Minhas Tarefas"**: Página principal que exibe todas as tarefas atribuídas ao membro que não estão concluídas.
-   **Visualização de Projetos (Leitura com Edição Limitada)**:
    *   Pode visualizar o andamento dos projetos (Tabela, Gantt, Kanban).
    *   Pode **atualizar** o status e o progresso de uma tarefa que lhe foi atribuída (essencial para o funcionamento do Kanban via drag-and-drop).
    *   **Não pode** criar, editar ou excluir projetos.
    *   **Não pode** criar ou excluir tarefas, ou editar tarefas que não lhe pertencem.

## 4. Funcionalidades Gerais

-   **Autenticação Segura**: Login e recuperação de senha gerenciados pelo Supabase.
-   **Calendário**: Exibe as tarefas em um calendário mensal, respeitando as permissões de cada perfil.
-   **Responsividade**: A interface se adapta a diferentes tamanhos de tela.
