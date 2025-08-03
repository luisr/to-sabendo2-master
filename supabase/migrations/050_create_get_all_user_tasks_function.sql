-- supabase/migrations/050_create_get_all_user_tasks_function.sql

CREATE OR REPLACE FUNCTION get_all_user_tasks()
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tasks t
  WHERE t.project_id IN (SELECT p.id FROM projects p);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função só pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION get_all_user_tasks() TO authenticated;
