-- =============================================================================
--  MIGRAÇÃO 019: RECRIAR POLÍTICA DE GERENCIAMENTO DE STATUS DE FORMA SEGURA
--  Este script cria uma nova política de RLS para a tabela task_statuses
--  que permite que Admins e Gerentes gerenciem os status, sem causar
--  a recursão infinita do bug anterior.
-- =============================================================================

-- Esta política concede permissões totais (INSERT, UPDATE, DELETE) na tabela
-- task_statuses para usuários cujo perfil (role) na tabela 'users' é
-- 'Admin' ou 'Gerente'.
-- A verificação é feita diretamente na tabela 'users', o que é seguro neste contexto,
-- pois não cria o ciclo de recursão que existia antes.

CREATE POLICY "Admins e Gerentes podem gerenciar status"
ON public.task_statuses
FOR ALL
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'::user_role
  OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Gerente'::user_role
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'::user_role
  OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Gerente'::user_role
);
