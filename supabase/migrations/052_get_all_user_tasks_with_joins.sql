-- supabase/migrations/052_get_all_user_tasks_with_joins.sql

-- First, drop the old function to ensure a clean update.
DROP FUNCTION IF EXISTS get_all_user_tasks();

-- Recreate the function to include joins for related data.
-- This function now returns a structure that includes the necessary fields
-- from the users and task_statuses tables, which is required by the frontend.
CREATE OR REPLACE FUNCTION get_all_user_tasks()
RETURNS TABLE(
    -- All columns from the 'tasks' table are explicitly listed.
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
    -- Manually build JSON objects to mimic the structure the frontend expects.
    assignee json,
    task_statuses json,
    task_tags jsonb -- Return an empty array for tags to prevent errors.
)
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Determine the role of the current user.
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();

    -- Admins see all tasks from all projects.
    IF user_role = 'Admin' THEN
        RETURN QUERY
        SELECT
            t.id, t.created_at, t.name, t.project_id, t.assignee_id, t.status_id, t.parent_id,
            t.start_date, t.end_date, t.progress, t.priority, t.wbs_code, t.observation,
            json_build_object('id', u.id, 'name', u.name) as assignee,
            json_build_object('id', ts.id, 'name', ts.name, 'color', ts.color) as task_statuses,
            '[]'::jsonb as task_tags -- Return empty JSON array for tags
        FROM
            public.tasks t
        LEFT JOIN
            public.users u ON t.assignee_id = u.id
        LEFT JOIN
            public.task_statuses ts ON t.status_id = ts.id;
    ELSE
        -- Other users see tasks only from projects they are collaborators on.
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

-- Grant execute permissions to all authenticated users.
GRANT EXECUTE ON FUNCTION get_all_user_tasks() TO authenticated;
