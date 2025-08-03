-- supabase/migrations/057_simplify_observations_rls_policy.sql

-- Drop a política antiga e complexa que estava causando o erro 500.
DROP POLICY IF EXISTS "Allow read access to observations on collaborated projects" ON public.task_observations;
DROP POLICY IF EXISTS "Allow admin read access to all observations" ON public.task_observations;

-- Cria uma única política de leitura que é mais simples e eficiente.
-- Ela cobre tanto administradores quanto membros do projeto.
CREATE POLICY "Allow read access for project members and admins"
ON public.task_observations FOR SELECT
TO authenticated
USING (
  -- Permite a leitura se o usuário for um administrador...
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
  OR
  -- ...ou se existir uma colaboração no projeto da tarefa.
  EXISTS (
    SELECT 1
    FROM tasks
    JOIN collaborators ON tasks.project_id = collaborators.project_id
    WHERE tasks.id = task_observations.task_id AND collaborators.user_id = auth.uid()
  )
);
