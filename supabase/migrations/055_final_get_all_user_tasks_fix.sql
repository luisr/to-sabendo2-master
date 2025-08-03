-- supabase/migrations/055_final_get_all_user_tasks_fix.sql

-- Drop the previous function to apply the final, simplified version.
DROP FUNCTION IF EXISTS get_all_user_tasks();

-- Recreate the function to return a simple, flat structure.
-- This avoids the "structure mismatch" errors by making the return type straightforward.
CREATE OR REPLACE FUNCTION get_all_user_tasks()
RETURNS TABLE (
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
    -- Return joined data as flat columns, which is more robust.
    assignee_name text,
    status_name text,
    status_color text
)
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the user's role.
    SELECT role INTO user_role FROM public.users WHERE public.users.id = auth.uid();

    -- Return the appropriate tasks based on the user's role.
    -- The SELECT statement now perfectly matches the RETURNS TABLE definition.
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
    WHERE
        (user_role = 'Admin') OR (t.project_id IN (
            SELECT c.project_id
            FROM public.collaborators c
            WHERE c.user_id = auth.uid()
        ));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions.
GRANT EXECUTE ON FUNCTION get_all_user_tasks() TO authenticated;
