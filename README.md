# To Sabendo - Gerenciador de Projetos com IA

Bem-vindo ao **To Sabendo**, um gerenciador de projetos de código aberto construído com Next.js, Supabase e Tailwind CSS, projetado para ser uma plataforma robusta e extensível para gestão de projetos, tarefas e equipes.

## Visão Geral

Este projeto fornece uma base sólida para a construção de um sistema de gerenciamento de projetos completo, com funcionalidades que incluem:

- **Gestão de Projetos e Tarefas:** Crie e gerencie projetos, tarefas e subtarefas de forma hierárquica.
- **Colaboração em Equipe:** Adicione colaboradores aos projetos com diferentes níveis de permissão.
- **Segurança Robusta:** Utiliza o sistema de Row Level Security (RLS) do Supabase para garantir que os usuários acessem apenas os dados que lhes são permitidos.
- **Autenticação Integrada:** Gerenciamento de usuários e perfis integrado com o Supabase Auth.
- **Armazenamento Seguro:** Upload e download de anexos em tarefas, com políticas de segurança granulares no Supabase Storage.

## Setup e Instalação

Para configurar o ambiente de desenvolvimento e executar o projeto, siga os passos abaixo. O processo foi consolidado para ser o mais simples possível.

### Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) (geralmente instalado com o Node.js)

### Passo 1: Configurar o Projeto Supabase

1.  **Crie um Projeto:** Acesse seu [painel do Supabase](https://supabase.com/dashboard/projects) e crie um novo projeto.
2.  **Obtenha as Credenciais:** No painel do seu projeto, vá para **Project Settings > API**. Você precisará da **Project URL** e da chave **`anon` public**.
3.  **Crie um Bucket de Armazenamento:** Vá para a seção **Storage** e crie um novo bucket chamado `tosabendo2`. **Importante:** Mantenha este bucket como **privado**. As políticas de segurança que iremos aplicar garantirão o acesso seguro.

### Passo 2: Configurar o Ambiente Local

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/seu-usuario/to-sabendo.git
    cd to-sabendo
    ```
2.  **Instale as Dependências:**
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente:**
    - Crie um ficheiro `.env.local` na raiz do projeto.
    - Adicione as credenciais do seu projeto Supabase a este ficheiro:
      ```env
      NEXT_PUBLIC_SUPABASE_URL=SUA_PROJECT_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
      ```

### Passo 3: Executar o Script de Setup do Banco de Dados

Toda a configuração do banco de dados (tabelas, funções, políticas de segurança e dados iniciais) foi consolidada em um único script.

1.  **Acesse o SQL Editor:** No painel do seu projeto Supabase, vá para a seção **SQL Editor**.
2.  **Execute o Script:**
    - Abra o ficheiro `supabase/setup_consolidado.sql` que se encontra neste repositório.
    - Copie todo o conteúdo do ficheiro.
    - Cole o conteúdo no SQL Editor e clique em **"Run"**.

**Importante:** O script de seed (dados iniciais) está configurado com IDs de usuário de exemplo. Para que os dados de exemplo (projetos, tarefas) sejam associados corretamente, você precisará:
1.  Criar os usuários no painel de **Authentication > Users** do Supabase.
2.  Copiar os IDs desses usuários.
3.  Colar os IDs nos locais indicados na **PART 6** do script `setup_consolidado.sql` antes de o executar.

### Passo 4: Executar a Aplicação

Com o backend configurado, você pode iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver a aplicação em funcionamento.

## Arquitetura de Segurança

A segurança é um pilar deste projeto, garantida por várias camadas:

- **Row Level Security (RLS):** Todas as tabelas principais têm políticas de RLS ativas, garantindo que as consultas (mesmo as feitas diretamente do cliente) só retornem os dados permitidos.
- **Funções `SECURITY DEFINER`:** Funções auxiliares críticas são executadas com os privilégios do criador da função, permitindo verificações de permissão seguras sem expor a lógica ao cliente.
- **Políticas de Storage:** O acesso ao bucket de armazenamento é controlado por políticas que verificam se um usuário é membro de um projeto antes de permitir o upload ou download de ficheiros, prevenindo o acesso não autorizado a anexos.
- **Tabela `profiles`:** Os dados públicos dos usuários são armazenados numa tabela `profiles`, separada da tabela `auth.users` do Supabase, seguindo as melhores práticas de segurança e evitando a exposição de dados sensíveis.

---

Agradecemos o seu interesse no To Sabendo! Se encontrar algum problema ou tiver sugestões, por favor, abra uma issue.
