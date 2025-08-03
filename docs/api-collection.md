# Coleção de API e Padrões de Acesso a Dados

Este documento descreve como o frontend interage com o backend do Supabase, utilizando uma combinação de consultas diretas, Edge Functions e chamadas de procedimento remoto (RPC).

## 1. Cliente Supabase

A conexão é gerenciada por um cliente singleton em `src/lib/supabase.ts`.

## 2. Padrões de Acesso a Dados

### 2.1. Consultas Diretas (Padrão)

Para a maioria das operações de leitura e escrita, usamos a API padrão do Supabase. A segurança é garantida pela **Row Level Security (RLS)**, que filtra os dados automaticamente no banco de dados com base no perfil do usuário autenticado.

-   **Exemplo (Leitura de Projetos para não-admins):**
    ```javascript
    // A RLS garante que apenas projetos associados ao usuário sejam retornados.
    const { data, error } = await supabase.from('projects').select('*');
    ```

### 2.2. Ações Privilegiadas (Edge Functions)

Para operações que exigem privilégios elevados (como criar um novo usuário no sistema de autenticação), utilizamos as Supabase Edge Functions. Elas são executadas em um ambiente seguro no servidor e usam a chave de `service_role`.

-   **Exemplo (Criação de Usuários - `create-user`):**
    ```javascript
    const { error } = await supabase.functions.invoke('create-user', {
        body: { email, password, name, role }
    });
    ```

### 2.3. Consultas Especiais com Privilégios (RPC)

Quando precisamos executar uma consulta complexa ou contornar a RLS padrão de forma controlada (especialmente para administradores), usamos chamadas de procedimento remoto (RPC).

-   **Exemplo (Leitura de *Todos* os Projetos para Admins):**
    -   Uma função SQL `get_all_projects_for_admin` é criada no banco de dados. Ela verifica internamente se o usuário é um 'Admin' e, em caso afirmativo, retorna todos os projetos, ignorando a política de "membro do projeto".
    -   **Chamada no Frontend (dentro do `useProjects`):**
        ```javascript
        // Chama a função `get_all_projects_for_admin` no banco de dados.
        const { data, error } = await supabase.rpc('get_all_projects_for_admin');
        ```

## 3. Políticas de Segurança (Row Level Security - RLS)

A segurança é a base da nossa arquitetura de dados e é garantida no nível do banco de dados.

-   **Funções Auxiliares:** Usamos funções SQL como `is_admin()` e `is_project_member()` com `SECURITY DEFINER` para criar políticas legíveis e seguras, evitando recursão infinita.
-   **Leitura**: Um usuário não-admin só pode ler um projeto se for um colaborador direto.
-   **Escrita**: Restrita a usuários com `role` de `Admin` ou `Gerente`.

## 4. Gerenciamento de Estado no Frontend (React Hooks)

-   **`useTasks`, `useProjects`, `useUsers`**: Provedores centrais que encapsulam toda a lógica de acesso a dados, decidindo se usam uma consulta direta ou uma chamada RPC com base no perfil do usuário.
-   **`useTableSettings`**: Gerencia as preferências do usuário para colunas e status.
