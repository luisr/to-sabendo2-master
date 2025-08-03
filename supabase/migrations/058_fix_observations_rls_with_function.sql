-- supabase/migrations/058_fix_observations_rls_with_function.sql

-- Step 1: Create a dedicated SQL function to check task visibility.
-- This encapsulates the complex logic, making it more performant and preventing RLS errors.
CREATE OR REPLACE FUNCTION public.can_view_task(p_task_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role TEXT;
  is_collaborator BOOLEAN;
BEGIN
  -- Immediately return true for admins.
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  IF user_role = 'Admin' THEN
    RETURN true;
  END IF;

  -- For other users, check if they are a collaborator on the task's project.
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.collaborators c ON t.project_id = c.project_id
    WHERE t.id = p_task_id AND c.user_id = auth.uid()
  ) INTO is_collaborator;

  RETURN is_collaborator;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permission for authenticated users to execute this function.
GRANT EXECUTE ON FUNCTION public.can_view_task(uuid) TO authenticated;


-- Step 2: Drop all old, problematic RLS policies on the table.
DROP POLICY IF EXISTS "Allow read access for project members and admins" ON public.task_observations;
DROP POLICY IF EXISTS "Allow read access to observations on collaborated projects" ON public.task_observations;
DROP POLICY IF EXISTS "Allow admin read access to all observations" ON public.task_observations;
DROP POLICY IF EXISTS "Allow users to create observations on collaborated projects" ON public.task_observations;
DROP POLICY IF EXISTS "Allow admins to create observations on any task" ON public.task_observations;
DROP POLICY IF EXISTS "Allow users to delete their own observations" ON public.task_observations;
DROP POLICY IF EXISTS "Allow admins to delete any observation" ON public.task_observations;


-- Step 3: Create new, ultra-simple RLS policies that call the function.

-- Policy for SELECT (Reading)
CREATE POLICY "Allow read on observations based on task visibility"
ON public.task_observations FOR SELECT
TO authenticated
USING ( public.can_view_task(task_id) );

-- Policy for INSERT (Creating)
CREATE POLICY "Allow insert on observations based on task visibility"
ON public.task_observations FOR INSERT
TO authenticated
WITH CHECK ( public.can_view_task(task_id) AND user_id = auth.uid() );

-- Policy for DELETE
CREATE POLICY "Allow delete for observation owners and admins"
ON public.task_observations FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);
