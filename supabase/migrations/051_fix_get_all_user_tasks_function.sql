-- supabase/migrations/051_fix_get_all_user_tasks_function.sql

-- Drop the old, incorrect function first to ensure a clean slate.
DROP FUNCTION IF EXISTS get_all_user_tasks();

-- Recreate the function with correct logic.
CREATE OR REPLACE FUNCTION get_all_user_tasks()
RETURNS SETOF tasks -- The function will return rows that match the structure of the 'tasks' table.
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the role of the currently authenticated user.
    -- This requires the function to run with elevated privileges (SECURITY DEFINER),
    -- as users might not have direct access to the 'users' table.
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();

    -- If the user is an 'Admin', return all tasks from all projects.
    IF user_role = 'Admin' THEN
        RETURN QUERY SELECT t.* FROM public.tasks t;
    ELSE
        -- For non-admins, return tasks only from projects where they are a collaborator.
        -- This joins the tasks table with the collaborators table to filter based on the current user's ID.
        RETURN QUERY
        SELECT t.*
        FROM public.tasks t
        WHERE t.project_id IN (
            SELECT c.project_id
            FROM public.collaborators c
            WHERE c.user_id = auth.uid()
        );
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execution permission to all authenticated users.
-- The function's internal logic will handle who sees what.
GRANT EXECUTE ON FUNCTION get_all_user_tasks() TO authenticated;
