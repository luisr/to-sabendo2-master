# Histórico de Interações - Projeto "To Sabendo"

Este documento registra as principais interações e decisões de desenvolvimento durante a criação da aplicação.

### Interações Iniciais (1-21): Setup e Funcionalidades com Dados Mocado
- **Resumo**: Foco na criação da estrutura do projeto, desenvolvimento das interfaces e implementação das funcionalidades principais com dados mocados.

### Interação 22: Início da Integração com Supabase
- **Resumo**: Conexão inicial com o backend do Supabase, implementação do login real.

### Interações 23-45: Fase Intensiva de Depuração e Estabilização
- **Resumo**: Substituição dos dados mocados por chamadas reais ao Supabase, seguida por uma fase intensiva de depuração para resolver uma cascata de erros de banco de dados, RLS e autenticação. Os scripts `schema.sql` e `seed.sql` foram tornados idempotentes e robustos.

### Interações 46-55: Refatoração da Arquitetura de Estado e Implementação de Funcionalidades Avançadas
- **Resumo**: Após a estabilização, foi realizada uma refatoração em larga escala para centralizar o gerenciamento de estado da aplicação com hooks (`useTasks`, `useProjects`, `useUsers`), seguida pela implementação de funcionalidades avançadas.

### Interação 56: Depuração Crítica de RLS e Correção Arquitetural
- **Resumo**: Após uma série de bugs persistentes (loops infinitos, permissões negadas, dados não carregados), foi realizada uma depuração profunda e uma correção arquitetural completa no sistema de Políticas de Segurança (RLS) do Supabase.
- **Problema Identificado (Causa Raiz)**:
    -   **Recursão Infinita**: As políticas de segurança estavam causando um loop infinito. Por exemplo, a política da tabela `tasks` precisava ler a tabela `collaborators` para verificar a permissão, o que, por sua vez, acionava a política da tabela `collaborators`, que também tentava ler a tabela `collaborators` novamente.
    -   **Contexto de Segurança Incorreto**: O uso inconsistente de `SECURITY DEFINER` e `SECURITY INVOKER` nas funções auxiliares (`is_admin`, `is_project_member`) quebrou o contexto do usuário (`auth.uid()`), fazendo com que as verificações de permissão falhassem silenciosamente.
- **Solução Arquitetural Implementada**:
    1.  **Limpeza Total**: Um script de migração mestre foi criado para remover todas as políticas de RLS antigas e conflitantes, limpando o estado quebrado do banco de dados.
    2.  **Uso Correto de `SECURITY DEFINER`**: As funções auxiliares (`is_project_member`, `is_project_manager`) foram recriadas com `SECURITY DEFINER`. Isso permite que elas atuem como "chaves mestras", lendo uma tabela sem acionar as políticas dela, quebrando assim o ciclo de recursão.
    3.  **Políticas Não-Recursivas**: A política da tabela `collaborators`, que era a principal fonte de recursão, foi reescrita para usar uma subconsulta direta e não-recursiva, garantindo que ela nunca precise chamar uma função que leia a si mesma.
    4.  **Permissões Granulares**: As políticas foram reescritas para serem mais granulares, com regras separadas para `SELECT` (leitura) e `ALL` (gerenciamento), alinhando o comportamento do banco de dados com as regras de negócio de cada perfil (Admin, Gerente, Membro).
- **Resultado Final**: A arquitetura de segurança do banco de dados foi completamente estabilizada. Os loops infinitos foram eliminados, as permissões foram alinhadas com a documentação, e a aplicação voltou a ser funcional e segura.
