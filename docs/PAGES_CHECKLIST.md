# Checklist de Revisão de Páginas por Perfil

Este documento serve como um guia para a revisão e depuração de todas as páginas e funcionalidades principais da aplicação, garantindo que a experiência de cada perfil de usuário seja coesa, funcional e livre de erros.

## Perfil: Super Admin

O Admin deve ter uma visão global e controle total sobre o sistema.

-   [ ] **Login**: Acesso com credenciais de Admin.
-   [ ] **Dashboard (`/admin/dashboard`)**:
    -   [ ] Exibe a visão consolidada de **todos** os projetos.
    -   [ ] KPIs (Orçamento, Projetos, Progresso) refletem os dados globais.
    -   [ ] Gráficos e listas de tarefas/projetos recentes estão corretos.
    -   [ ] O painel é personalizável (ocultar/mostrar widgets).
-   [ ] **Gestão de Usuários (`/admin/users`)**:
    -   [ ] Lista todos os usuários do sistema.
    -   [ ] Permite **criar** novos usuários.
    -   [ ] Permite **editar** o nome e o perfil de usuários existentes.
    -   [ ] Permite **excluir** usuários (com diálogo de confirmação).
-   [ ] **Gestão de Projetos (`/admin/projects`)**:
    -   [ ] Seletor de projetos inclui a "Visão Consolidada" e todos os projetos.
    -   [ ] Visão consolidada exibe KPIs globais.
    -   [ ] Ao selecionar um projeto, as abas (Tabela, Kanban, Gantt, EAP) são exibidas corretamente.
    -   [ ] Pode **criar** um novo projeto.
-   [ ] **Calendário (`/admin/calendar`)**:
    -   [ ] Exibe as tarefas de **todos** os projetos da organização.
    -   [ ] A interface é responsiva e funcional.
-   [ ] **Backlog (`/admin/backlog`)**:
    -   [ ] Acesso à visão de backlog (atualmente espelha a visão do Gerente).
-   [ ] **Navegação**:
    -   [ ] A sidebar do Admin é exibida corretamente, com os links corretos.
    -   [ ] O layout geral da página é consistente.

## Perfil: Gerente de Projetos

O Gerente tem controle total sobre os projetos que lidera.

-   [ ] **Login**: Acesso com credenciais de Gerente.
-   [ ] **Dashboard (`/dashboard`)**:
    -   [ ] Exibe a visão consolidada dos projetos que **gerencia**.
    -   [ ] KPIs refletem os dados agregados dos seus projetos.
    -   [ ] O painel é personalizável.
-   [ ] **Página de Projetos (`/projects`)**:
    -   [ ] Seletor de projetos inclui "Visão Consolidada" e **apenas** os projetos que gerencia.
    -   [ ] Visão consolidada funciona corretamente.
    -   [ ] Ao selecionar um projeto, as abas (Tabela, Kanban, Gantt, EAP) são exibidas.
    -   [ ] **Ações de Gerenciamento** (visíveis apenas quando um projeto é selecionado e ele é o gerente):
        -   [ ] Botão "Gerenciar Equipe" abre o modal e funciona.
        -   [ ] Menu "..."
            -   [ ] Editar Projeto (abre o modal com dados preenchidos).
            -   [ ] Baixar Projeto (exporta CSV).
            -   [ ] Importar Tarefas (abre o modal de importação para o projeto atual).
            -   [ ] Replanejamento com IA (abre o modal e o fluxo funciona).
            -   [ ] Excluir Projeto (mostra diálogo de confirmação e funciona).
    -   [ ] **Ações Gerais**:
        -   [ ] Botão "Importar Novo Projeto" funciona.
-   [ ] **Calendário (`/calendar`)**:
    -   [ ] Exibe tarefas **apenas** dos projetos em que é colaborador.
-   [ ] **Backlog (`/backlog`)**:
    -   [ ] Seletor de projetos é consistente com a página de Projetos.
    -   [ ] A tabela de backlog funciona e mostra os nomes dos projetos.
-   [ ] **Minhas Tarefas (`/my-tasks`)**:
    -   [ ] Exibe uma lista de todas as tarefas atribuídas a ele.
-   [ ] **Navegação**:
    -   [ ] A sidebar do Membro/Gerente é exibida corretamente.
    -   [ ] O layout geral é consistente.

## Perfil: Membro

O Membro tem uma visão focada na execução de suas próprias tarefas.

-   [ ] **Login**: Acesso com credenciais de Membro.
-   [ ] **Dashboard (`/dashboard`)**:
    -   [ ] Não exibe visão consolidada.
    -   [ ] Seletor de projetos permite escolher um dos projetos em que é colaborador.
    -   [ ] Exibe dados do projeto selecionado.
-   [ ] **Página de Projetos (`/projects`)**:
    -   [ ] Seletor de projetos mostra **apenas** os projetos em que é colaborador.
    -   [ ] As abas (Tabela, Kanban, Gantt, EAP) são exibidas e funcionam.
    -   [ ] **Não** exibe botões de gerenciamento (Editar, Excluir, Gerenciar Equipe, etc.).
-   [ ] **Minhas Tarefas (`/my-tasks`)**:
    -   [ ] Exibe corretamente todas as tarefas atribuídas ao membro.
    -   [ ] Permite a atualização do status das tarefas.
-   [ ] **Calendário (`/calendar`)**:
    -   [ ] Exibe tarefas **apenas** dos projetos em que é colaborador.
-   [ ] **Backlog (`/backlog`)**:
    -   [ ] Permite a visualização do backlog dos projetos em que é colaborador.
-   [ ] **Navegação**:
    -   [ ] A sidebar do Membro/Gerente é exibida.
    -   [ ] O layout geral é consistente.
