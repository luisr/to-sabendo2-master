# Coleção de API e Modelos de Dados - To Sabendo

Este documento serve como um contrato entre o frontend e o backend, detalhando os modelos de dados e como eles são consumidos pelas diferentes partes da aplicação. O objetivo é guiar a construção de uma API RESTful que atenda às necessidades do cliente.

## 1. Modelos de Dados Principais (Conforme Schema Supabase)

Estes são os objetos de dados fundamentais que a API deve fornecer.

### 1.1. `Project`

Representa um projeto no sistema. Corresponde à tabela `public.projects`.

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Identificador único do projeto. | `"a1b2c3d4-..."` |
| `name` | `text` (Único) | O nome do projeto. | `"Projeto Alpha"` |
| `description` | `text` | Uma breve descrição do objetivo do projeto. | `"Desenvolvimento do novo app."` |
| `budget` | `numeric` | O orçamento total alocado para o projeto. | `50000.00` |
| `spent` | `numeric` | O valor do orçamento já utilizado. | `25000.00` |
| `start_date` | `date` | A data de início do projeto. | `"2024-05-01"` |
| `end_date` | `date` | A data de término prevista para o projeto. | `"2024-07-30"` |

### 1.2. `User`

Representa o perfil de um usuário no sistema. Corresponde à tabela `public.users`.

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Chave estrangeira que referencia `auth.users(id)`. | `"e5f6g7h8-..."` |
| `name` | `text` | Nome completo do usuário. | `"Diego"` |
| `email` | `text` (Único) | Email do usuário, usado para login. | `"diego@example.com"` |
| `contact` | `text` (Opcional) | Número de contato do usuário. | `"(11) 93333-3333"` |
| `avatar` | `text` | Iniciais do usuário para exibição no avatar. | `"D"` |
| `role` | `user_role` | Perfil de permissão (`Admin`, `Gerente`, `Membro`). | `"Membro"` |
| `status` | `user_status` | Status da conta (`Ativo` ou `Inativo`). | `"Ativo"` |

### 1.3. `Collaborator`

Tabela de associação que liga `Users` a `Projects`. Corresponde à `public.collaborators`.

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `project_id` | `uuid` | O ID do projeto. |
| `user_id` | `uuid` | O ID do usuário. |
| `role` | `text` | O papel do usuário no projeto (`Gerente` ou `Membro`). |

### 1.4. `Task`

Representa uma tarefa individual dentro de um projeto. Corresponde à `public.tasks`.

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Identificador único da tarefa. | `"c9d8e7f6-..."` |
| `project_id` | `uuid` | O ID do projeto ao qual a tarefa pertence. | `"a1b2c3d4-..."` |
| `name` | `text` | O título ou nome da tarefa. | `"Planejamento Inicial"` |
| `assignee_id` | `uuid` | O ID do usuário responsável pela tarefa. | `"e5f6g7h8-..."` |
| `status_id` | `uuid` | O ID do status da tarefa (ex: "A Fazer"). | `"f1e2d3c4-..."` |
| `priority` | `task_priority` | A prioridade da tarefa (`Baixa`, `Média`, `Alta`). | `"Alta"` |
| `start_date` | `date` | A data de início da tarefa. | `"2024-05-01"` |
| `end_date` | `date` | A data de término prevista para a tarefa. | `"2024-05-05"` |
| `progress` | `integer` (0-100) | Percentual de conclusão da tarefa. | `100` |
| `parent_id` | `uuid` (Opcional) | O ID da tarefa "pai" em uma estrutura WBS. | `null` |
| `milestone` | `boolean` | Indica se a tarefa é um marco importante. | `true` |
| `tags` | `jsonb` | Etiquetas para categorização. | `["Core", "UI/UX"]` |
| `dependencies` | `uuid[]` | Um array de IDs de tarefas das quais esta tarefa depende. | `["d1e2f3a4-..."]` |


### Tabelas Auxiliares

-   **`public.task_statuses`**: Armazena os possíveis status de uma tarefa (`id`, `name`, `color`, `order`).
-   **`public.comments`**: Armazena comentários sobre tarefas (`id`, `task_id`, `user_id`, `text`, `date`).
-   **`public.baselines`**: "Fotografias" do cronograma (`id`, `task_id`, `name`, `start_date`, `end_date`).
-   **`public.task_dependencies`**: Define as dependências entre tarefas (`task_id`, `dependency_id`).

## 2. Padrões de Consumo de Dados

O frontend interage diretamente com o Supabase via cliente JavaScript, em vez de uma API REST tradicional. As consultas são construídas nos componentes e hooks para buscar os dados necessários.

### Exemplo de Consulta: Buscar Projetos para um Gerente

```javascript
// Exemplo de como o ProjectSelector pode buscar os projetos de um gerente
const { data, error } = await supabase
  .from('projects')
  .select('*, collaborators!inner(user_id, role)')
  .eq('collaborators.user_id', currentUserId)
  .eq('collaborators.role', 'Gerente');
```

### Exemplo de Consulta: Buscar Tarefas de um Projeto

```javascript
// Exemplo de como a TableView pode buscar tarefas
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', selectedProjectId);
```

As operações de **Criar, Atualizar e Excluir (CRUD)** são realizadas usando os métodos `supabase.from('tableName').insert()`, `update()`, e `delete()`. A segurança é garantida pelas **Políticas de Row Level Security (RLS)** definidas no `schema.sql`, que filtram automaticamente os dados com base no `user_id` e `role` do usuário autenticado.
