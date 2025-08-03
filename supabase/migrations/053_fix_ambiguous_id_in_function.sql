-- supabase/migrations/053_fix_ambiguous_id_in_function.sql

-- Drop the old function to apply the fix.
DROP FUNCTION IF EXISTS get_all_user_tasks();

-- Recreate the function with the ambiguous 'id' reference corrected.
CREATE OR REPLACE FUNCTION get_all_user_tasks()
RETURNS TABLE(
    -- The output structure remains the same as the previous version.
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
    assignee json,
    task_statuses json,
    task_tags jsonb
)
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- This is the critical fix: Qualify 'id' with the table name 'public.users'
    -- to resolve the "column reference is ambiguous" error.
    SELECT role INTO user_role FROM public.users WHERE public.users.id = auth.uid();

    -- Admins can see all tasks.
    IF user_role = 'Admin' THEN
        RETURN QUERY
        SELECT
            t.id, t.created_at, t.name, t.project_id, t.assignee_id, t.status_id, t.parent_id,
            t.start_date, t.end_date, t.progress, t.priority, t.wbs_code, t.observation,
            json_build_object('id', u.id, 'name', u.name) as assignee,
            json_build_object('id', ts.id, 'name', ts.name, 'color', ts.color) as task_statuses,
            '[]'::jsonb as task_tags
        FROM
            public.tasks t
        LEFT JOIN
            public.users u ON t.assignee_id = u.id
        LEFT JOIN
            public.task_statuses ts ON t.status_id = ts.id;
    ELSE
        -- Other users see tasks from projects they are part of.
        RETURN QUERY
        SELECT
            t.id, t.created_at, t.name, t.project_id, t.assignee_id, t.status_id, t.parent_id,
            t.start_date, t.end_date, t.progress, t.priority, t.wbs_code, t.observation,
            json_build_object('id', u.id, 'name', u.name) as assignee,
            json_build_object('id', ts.id, 'name', ts.name, 'color', ts.color) as task_statuses,
            '[]'::jsonb as task_tags
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
