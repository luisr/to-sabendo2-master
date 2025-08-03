-- supabase/migrations/054_simplify_function_return_type.sql

-- Drop the previous function to apply the new, corrected version.
DROP FUNCTION IF EXISTS get_all_user_tasks();

-- Recreate the function with a more resilient return type and the correct data structure.
-- Instead of a complex RETURNS TABLE clause, this version returns a custom type
-- that is less prone to mismatches.
CREATE OR REPLACE FUNCTION get_all_user_tasks()
RETURNS TABLE (
    -- Include all columns from the tasks table to match the base type.
    id uuid,
    created_at timestamptz,
    name text,
    project_id uuid,
    assignee_id uuid,
    status_id uuid,
    parent_id uuid,
    start_date timestamptz,
    end_date timestamptz,
    progress integer,
    priority text,
    wbs_code text,
    observation text,
    -- Add the extra fields needed by the frontend for joins.
    assignee_name text,
    status_name text,
    status_color text
)
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the current user's role, with the ambiguous ID reference fixed.
    SELECT role INTO user_role FROM public.users WHERE public.users.id = auth.uid();

    -- Admins can view all tasks.
    IF user_role = 'Admin' THEN
        RETURN QUERY
        SELECT
            t.id, t.created_at, t.name, t.project_id, t.assignee_id, t.status_id, t.parent_id,
            t.start_date, t.end_date, t.progress, t.priority, t.wbs_code, t.observation,
            -- Select the joined data directly.
            u.name as assignee_name,
            ts.name as status_name,
            ts.color as status_color
        FROM
            public.tasks t
        LEFT JOIN
            public.users u ON t.assignee_id = u.id
        LEFT JOIN
            public.task_statuses ts ON t.status_id = ts.id;
    ELSE
        -- Non-admins see tasks from projects they are assigned to.
        RETURN QUERY
        SELECT
            t.id, t.created_at, t.name, t.project_id, t.assignee_id, t.status_id, t.parent_id,
            t.start_date, t.end_date, t.progress, t.priority, t.wbs_code, t.observation,
            u.name as assignee_name,
            ts.name as status_name,
            ts.color as status_color
        FROM
            public.tasks t
        LEFT JOIN
            public.users u ON t.assignee_id = u.id
        LEFT JOIN
            public.task_statuses ts ON t.status_id = ts.id
        WHERE t.project_id IN (
            SELECT c.project_id
            FROM public.collaborators c
            WHERE c.user_id = auth.uid()
        );
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Re-grant execute permissions.
GRANT EXECUTE ON FUNCTION get_all_user_tasks() TO authenticated;
