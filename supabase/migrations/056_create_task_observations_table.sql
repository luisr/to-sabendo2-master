-- supabase/migrations/056_create_task_observations_table.sql

CREATE TABLE IF NOT EXISTS public.task_observations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content text,
    file_url text, -- URL para o arquivo no Supabase Storage
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for task_observations
-- Os usuários podem ver as observações das tarefas às quais têm acesso.
ALTER TABLE public.task_observations ENABLE ROW LEVEL SECURITY;

-- Permite que usuários vejam observações de tarefas em projetos nos quais são colaboradores.
CREATE POLICY "Allow read access to observations on collaborated projects"
ON public.task_observations FOR SELECT
TO authenticated
USING (
  task_id IN (
    SELECT t.id
    FROM tasks t
    WHERE t.project_id IN (
      SELECT p.id
      FROM projects p
      JOIN collaborators c ON p.id = c.project_id
      WHERE c.user_id = auth.uid()
    )
  )
);

-- Permite que administradores vejam todas as observações.
CREATE POLICY "Allow admin read access to all observations"
ON public.task_observations FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);

-- Permite que usuários criem observações em tarefas de projetos nos quais são colaboradores.
CREATE POLICY "Allow users to create observations on collaborated projects"
ON public.task_observations FOR INSERT
TO authenticated
WITH CHECK (
  task_id IN (
    SELECT t.id
    FROM tasks t
    WHERE t.project_id IN (
      SELECT p.id
      FROM projects p
      JOIN collaborators c ON p.id = c.project_id
      WHERE c.user_id = auth.uid()
    )
  ) AND user_id = auth.uid()
);

-- Permite que administradores criem observações em qualquer tarefa.
CREATE POLICY "Allow admins to create observations on any task"
ON public.task_observations FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin' AND user_id = auth.uid()
);

-- Permite que o autor da observação a exclua.
CREATE POLICY "Allow users to delete their own observations"
ON public.task_observations FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

-- Permite que administradores excluam qualquer observação.
CREATE POLICY "Allow admins to delete any observation"
ON public.task_observations FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);
