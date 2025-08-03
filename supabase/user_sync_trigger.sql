-- =============================================================================
--  SCRIPT DE TRIGGER PARA SINCRONIZAÇÃO DE USUÁRIOS
--  Este script cria a função e o trigger para sincronizar novos usuários
--  da tabela `auth.users` para a tabela `public.users`.
-- =============================================================================

-- 1. CRIAR A FUNÇÃO `handle_new_user`
-- Esta função é acionada por um trigger e insere uma nova linha na `public.users`
-- sempre que um novo usuário é criado na `auth.users`.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insere o novo usuário na tabela public.users, definindo um role padrão.
  -- O `id` é referenciado diretamente de `auth.users` através do `NEW.id`.
  -- O e-mail e outros metadados são extraídos do objeto `raw_user_meta_data`.
  INSERT INTO public.users (id, name, email, avatar, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'Membro' -- Define 'Membro' como o role padrão para novos usuários.
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CRIAR O TRIGGER `on_auth_user_created`
-- Este trigger chama a função `handle_new_user` após a criação de um novo
-- usuário na tabela `auth.users`.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
--  INSTRUÇÕES DE USO:
--  1. Conecte-se ao seu banco de dados Supabase.
--  2. Execute o conteúdo deste script SQL no editor de SQL do Supabase.
--  3. Após a execução, o trigger estará ativo. Qualquer novo usuário criado
--     através do sistema de autenticação do Supabase (Supabase Auth) será
--     automaticamente adicionado à sua tabela `public.users`.
-- =============================================================================
