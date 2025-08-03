# To Sabendo - Gestão de Projetos Inteligente

Uma aplicação full-stack de gestão de projetos construída com Next.js, TypeScript, Supabase e Genkit. Desenvolvida para ser robusta, interativa e inteligente, com um sistema de permissões granular e seguro.

## Estado Atual do Projeto

O projeto atingiu um estágio maduro de desenvolvimento, com um conjunto robusto de funcionalidades para todos os perfis de usuário. O grande diferencial é a integração profunda com IA e as capacidades avançadas de visualização e customização de dados, tudo isso sustentado por uma arquitetura de segurança não-recursiva no backend.

## Funcionalidades Principais
-   **Segurança Granular (RLS)**: Arquitetura de permissões robusta que garante que cada perfil (Admin, Gerente, Membro) acesse apenas os dados permitidos.
-   **Tabela de Tarefas Avançada**: Uma EAP (WBS) completa com visualização hierárquica (subtarefas retráteis), filtros dinâmicos, seleção múltipla e ações em massa.
-   **Gerenciamento Completo de Projetos**: Gerentes podem criar, importar de CSV, editar, exportar e excluir projetos, além de gerenciar equipes.
-   **Customização do Fluxo de Trabalho**: Controle total sobre o ambiente, permitindo criar e gerenciar status, etiquetas (tags) e colunas customizadas.
-   **Ferramentas de IA Integradas**: Assistentes para criação de projetos, replanejamento e análise de riscos.
-   **Visualizações Múltiplas**: Quadro Kanban, Gráfico de Gantt e Calendário.

## Configuração do Ambiente

Siga estes passos para configurar o ambiente de desenvolvimento.

### Passo 1: Configurar o Supabase
1.  Crie seu projeto no site [supabase.com](https://supabase.com).
2.  Em **Project Settings > API**, copie a **URL** e a chave **`anon`**.
3.  Na raiz do seu projeto, copie o arquivo `.env.example` para um novo arquivo chamado `.env.local`.
4.  Cole a URL e a chave `anon` no seu arquivo `.env.local`.

### Passo 2: Configurar o Banco de Dados (Método Único)
No **SQL Editor** do seu painel Supabase, execute o conteúdo do seguinte arquivo:

1.  **`supabase/setup-production.sql`**: Este é o único script necessário. Ele limpa, cria o schema, define as funções e aplica todas as políticas de segurança (RLS) de uma só vez.

### Passo 3: Criar Usuários e Popular o Banco (Seeding)
1.  Crie os usuários de teste (ex: `admin@example.com`, `gp@example.com`) na seção **Authentication** do seu painel Supabase.
2.  Copie o `ID` de cada usuário criado na aba "Users".
3.  Abra o arquivo `supabase/seed.sql`, cole os IDs nas variáveis correspondentes no topo do arquivo.
4.  Execute o `seed.sql` no **SQL Editor** para popular o banco com dados de exemplo (projetos, tarefas, etc.).

### Passo 4: Rodar a Aplicação
1.  **Instale as dependências:** `npm install`
2.  **Rode o projeto:** `npm run dev`

Sua aplicação estará rodando localmente e conectada ao seu projeto Supabase.
