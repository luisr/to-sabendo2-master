# To Sabendo - Roteiro do Projeto (Blueprint)

Este documento descreve as funcionalidades planejadas e o estado atual do projeto "To Sabendo".

## Legenda de Status
-   ✅ **Concluído:** A funcionalidade está implementada e testada.
-   🚧 **Em Progresso:** A funcionalidade está sendo desenvolvida ativamente.
-   📅 **Planejado:** A funcionalidade está no roteiro, mas o desenvolvimento ainda não começou.

---

## Funcionalidades Essenciais:

### Gerenciamento de Usuários e Acesso
-   ✅ **Autenticação e Permissões**: Perfis distintos (Admin, Gerente, Membro) com RLS granular e não-recursiva.
-   ✅ **Gerenciamento Completo de Usuários (Admin)**: Admins podem criar, visualizar, editar e excluir usuários.
-   ✅ **Espaço de Trabalho Personalizado**: Dashboards e visões adaptadas para cada perfil.

### Gerenciamento de Projetos
-   ✅ **Ciclo de Vida do Projeto (Gerente)**: Gerentes podem criar, editar, baixar e excluir projetos.
-   ✅ **Gerenciamento de Equipe (Gerente)**: Gerentes podem adicionar e remover membros.
-   ✅ **Importação de Dados (CSV)**: Criar novos projetos a partir de um arquivo CSV.

### Inteligência Artificial e Análise
-   ✅ **Replanejamento Inteligente com IA**: Assistente que analisa um novo plano e sugere alterações.
-   ✅ **Criação de Projetos Assistida por IA**: Funcionalidade para criar projetos com sugestões de tarefas da IA.
-   ✅ **Painéis de KPI Consolidados e Personalizáveis**: KPIs agregados para Admin e Gerente.
-   ✅ **Previsão de Riscos Alimentada por IA**: Ferramenta que analisa o projeto e prevê possíveis riscos.
-   ✅ **Previsão de Atrasos e Orçamento com IA**: Ferramenta que analisa o projeto e prevê possíveis atrasos e estouros de orçamento.

### Visualizações de Projeto
-   ✅ **Tabela de Tarefas Interativa (Table View)**: Visualização hierárquica (subtarefas), com filtros, seleção múltipla e ações em massa.
-   ✅ **Quadro Kanban**: Organização de tarefas em colunas de status com drag-and-drop.
-   ✅ **Visão de Calendário Interativa**: Calendário moderno e responsivo.
-   ✅ **Gráfico de Gantt Interativo**: Gantt com visualização de dependências.
-   ✅ **Visão de EAP (WBS)**: Visualização da hierarquia de tarefas implementada na própria tabela.

### Customização
-   ✅ **Gerenciamento de Status**: Gerentes podem criar, renomear, alterar cor e excluir status no `TableManagerModal`.
-   ✅ **Gerenciamento de Etiquetas (Tags)**: Gerentes podem criar, editar e excluir tags no `TableManagerModal`.
-   ✅ **Gerenciamento de Colunas Customizadas**: Gerentes podem criar colunas de tipos diferentes (texto, número, data, fórmula).
-   🚧 **Controle de Visibilidade de Colunas**: A UI para controlar a visibilidade está implementada; a conexão final com a `TableView` está em andamento.
