-- =============================================================================
--  MIGRAÇÃO 018: CORRIGIR RECURSÃO INFINITA NA POLÍTICA DE RLS DE TASK_STATUSES
--  Este script remove a política de segurança redundante e defeituosa para Admins
--  na tabela task_statuses, que estava causando uma recursão infinita.
-- =============================================================================

-- A política "Admins podem gerenciar todos os usuários" na tabela "users" chama a função "is_admin()".
-- A função "is_admin()" lê a tabela "users", o que causa uma recursão.
-- A política abaixo, para a tabela "task_statuses", também usa "is_admin()", causando o mesmo problema.
-- A política "Usuários autenticados podem ver status, etc." já é suficiente para todos os usuários, incluindo Admins.

DROP POLICY IF EXISTS "Admins podem gerenciar status, etc." ON public.task_statuses;
