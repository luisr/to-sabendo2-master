# Sabendo - Gerenciador de Projetos Inteligente

Sabendo é uma plataforma de gerenciamento de projetos moderna, construída com Next.js, Supabase e Genkit AI. A ferramenta oferece uma experiência fluida para planejar, executar e monitorar projetos, com um foco especial em colaboração e automação inteligente.

## Visão Geral

A plataforma foi projetada para resolver desafios comuns no gerenciamento de projetos, como falta de visibilidade, dificuldade na colaboração e processos manuais demorados. Com uma interface intuitiva e recursos avançados, o Sabendo ajuda equipes a manterem o foco, cumprirem prazos e alcançarem seus objetivos.

## Funcionalidades Principais

- **Visualizações Múltiplas:** Acompanhe o progresso do projeto com diferentes visões:
  - **Tabela:** Uma visão detalhada e personalizável de todas as tarefas.
  - **Kanban:** Um quadro visual para gerenciar o fluxo de trabalho.
  - **Gráfico de Gantt:** Um cronograma interativo para planejar e visualizar dependências.
  - **EAP (WBS):** Uma estrutura analítica para decompor o projeto em entregas menores.
- **Hierarquia de Tarefas:** Crie subtarefas para organizar o trabalho de forma granular.
- **Visão Consolidada:** Gerencie múltiplos projetos em um único lugar, com visões consolidadas de Gantt e EAP.
- **Colaboração:** Convide membros para projetos, atribua tarefas e acompanhe o trabalho da equipe.
- **Recursos Inteligentes (IA):** Ferramentas baseadas em IA para auxiliar no planejamento, previsão de riscos e geração de relatórios (via Genkit AI).

## Tecnologias Utilizadas

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend e Banco de Dados:** Supabase (PostgreSQL, Auth, Realtime)
- **IA e Automação:** Google Genkit AI
- **Componentes:** shadcn/ui
- **Drag & Drop:** react-beautiful-dnd

## Configuração do Ambiente

Siga os passos abaixo para configurar e rodar o projeto localmente.

### 1. Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Conta no [Supabase](https://supabase.com/)
- Supabase CLI instalado: `npm install -g supabase`

### 2. Configuração do Supabase

1.  **Login no Supabase CLI:**
    ```bash
    supabase login
    ```

2.  **Vincule o Projeto:** Navegue até a pasta do projeto e vincule seu projeto Supabase (substitua `[project-ref]` pelo ID do seu projeto):
    ```bash
    supabase link --project-ref [project-ref]
    ```

3.  **Variáveis de Ambiente:**
    - Renomeie o arquivo `.env.local.example` para `.env.local`.
    - Abra o arquivo `.env.local` e preencha as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com as informações do seu projeto Supabase.

### 3. Configuração do Banco de Dados

1.  **Execute o Script de Setup:**
    - No painel do seu projeto Supabase, vá para o **SQL Editor**.
    - Copie o conteúdo do arquivo `supabase/setup_consolidado.sql` e execute-o. Isso criará todas as tabelas, funções e políticas de segurança (RLS).

2.  **Execute o Script de Seed (Dados de Exemplo):**
    - No **SQL Editor**, copie o conteúdo do arquivo `supabase/seed.sql` e execute-o.
    - **Importante:** O script de seed usa UUIDs de exemplo. Você precisará substituí-los pelos IDs dos usuários que você criou no seu ambiente de autenticação do Supabase.

### 4. Instalação e Execução do Projeto

1.  **Instale as Dependências:**
    ```bash
    npm install
    ```

2.  **Rode o Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    ```

A aplicação estará disponível em `http://localhost:3000` (ou na porta que você configurar).

## Próximos Passos e Contribuição

Este projeto está em constante evolução. Sinta-se à vontade para contribuir com novas funcionalidades, melhorias ou correções de bugs.
