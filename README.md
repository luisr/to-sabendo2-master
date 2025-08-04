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
1.  Crie um novo projeto no site [supabase.com](https://supabase.com).
2.  Em **Project Settings > API**, copie a **URL** e a chave **`anon`**.
3.  Na raiz do seu projeto, crie um arquivo chamado `.env.local`.
4.  Cole a URL e a chave `anon` no seu arquivo `.env.local`, seguindo o formato do arquivo `.env.example`.

### Passo 2: Criar Usuários de Teste
1.  No painel do Supabase, vá para **Authentication > Users** e crie os usuários de teste que desejar (ex: `admin@example.com`, `gp@example.com`, `membro@example.com`).
2.  Copie o `ID` de cada usuário criado na aba "Users".

### Passo 3: Configurar e Popular o Banco de Dados
1.  Abra o arquivo `supabase/setup_final.sql`.
2.  **No topo do arquivo**, cole os IDs dos usuários que você copiou nas variáveis correspondentes (`admin_user_id`, `gp_user_id`, `member_user_id`).
3.  Copie **todo o conteúdo** do arquivo `supabase/setup_final.sql`.
4.  No painel do Supabase, vá para **SQL Editor**, cole o conteúdo e clique em **RUN**.

Este script único irá criar as tabelas, funções, políticas de segurança e dados iniciais, deixando o banco de dados pronto para uso.

### Passo 4: Rodar a Aplicação
1.  **Instale as dependências:** `npm install`
2.  **Rode o projeto:** `npm run dev`

Sua aplicação estará rodando localmente e conectada ao seu projeto Supabase.
