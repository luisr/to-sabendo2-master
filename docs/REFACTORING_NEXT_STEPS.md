# Próximos Passos de Refatoração

Este documento descreve as prioridades de refatoração para o projeto "To Sabendo".

## Concluídos

-   [x] **Centralizar o Estado de Projetos com um Hook `useProjects`**: Concluído. Todas as páginas agora usam o hook centralizado.
-   [x] **Unificar o Acesso aos Dados de Usuários com um Hook `useUsers`**: Concluído. Os componentes relevantes agora consomem o hook `useUsers`.
-   [x] **Refatorar Componentes de IA para Usar Dados em Tempo Real**: Concluído. As principais ferramentas de IA (`ProjectCreationAssistant`, `RiskPredictionTool`) estão conectadas aos hooks.
-   [x] **Revisar e Fortalecer a Lógica de Dependências**: Concluído. A função `updateTask` foi refatorada com uma lógica de atualização em cascata robusta.

## Próximas Prioridades

### 1. Implementar Gerenciamento Centralizado de Etiquetas (Tags)

-   **Problema:** Atualmente, as etiquetas são criadas livremente como texto, o que pode levar a inconsistências ("Marketing" vs. "marketing").
-   **Solução:**
    1.  Criar uma nova tabela `public.tags` no `schema.sql` para armazenar as etiquetas de forma centralizada.
    2.  Criar uma página ou modal de "Configurações" onde um Admin possa gerenciar as etiquetas (criar, renomear, deletar).
    3.  Modificar os modais de tarefa para usar um componente de seleção múltipla (`multi-select`) que busca as etiquetas da nova tabela, em vez de um input de texto livre.
-   **Benefício:** Garante a consistência dos dados e melhora a capacidade de filtragem e relatórios.

### 2. Implementar a Criação de Gráficos e KPIs Customizados

-   **Problema:** A funcionalidade de criar novos widgets no dashboard é apenas um mockup. A lógica para salvar e renderizar esses widgets não existe.
-   **Solução:**
    1.  Criar uma tabela `public.custom_widgets` para armazenar as configurações dos widgets criados pelos usuários (tipo, métrica, agrupamento).
    2.  Implementar a lógica no `DashboardManagerModal` para salvar as configurações de um novo widget nesta tabela.
    3.  Na página do Dashboard, buscar os widgets customizados e renderizá-los dinamicamente usando o componente `CustomChartCard`.
-   **Benefício:** Entrega uma das funcionalidades de personalização mais poderosas e avançadas prometidas na documentação.

### 3. Implementar Histórico de Alterações de Tarefas

-   **Problema:** A documentação prevê que as alterações de datas nas tarefas devem ser justificadas e registradas, mas essa funcionalidade não existe.
-   **Solução:**
    1.  Criar uma nova tabela `public.task_history` no `schema.sql`.
    2.  Criar um novo modal, `JustificationModal`, que é acionado sempre que uma data crítica é alterada.
    3.  Modificar a função `updateTask` para que, após uma alteração de data, ela abra este modal.
    4.  Salvar a alteração e a justificativa na tabela `task_history`.
    5.  Exibir o histórico de uma tarefa no `ViewTaskModal`.
-   **Benefício:** Aumenta a rastreabilidade e a governança do projeto, uma funcionalidade chave para o gerenciamento de projetos.
