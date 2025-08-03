-- =============================================================================
--  MIGRAÇÃO 022: CORREÇÃO DEFINITIVA DO CONTEXTO DE SEGURANÇA (RLS)
--  Este script corrige a causa raiz dos problemas de permissão, ajustando
--  o contexto de segurança das funções auxiliares e da função de criação
--  de tarefas para SECURITY INVOKER.
-- =============================================================================

-- 1. CORRIGIR AS FUNÇÕES AUXILIARES DE PERMISSÃO
-- Estas funções precisam saber quem as está chamando, então devem ser SECURITY INVOKER.

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- CORRIGIDO

CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'Gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- CORRIGIDO

-- 2. CORRIGIR A FUNÇÃO DE CRIAÇÃO DE TAREFA
-- Esta função não precisa de privilégios elevados e deve rodar com as permissões do usuário.
-- O RLS bypass é removido, pois não é mais necessário.

CREATE OR REPLACE FUNCTION create_task_with_sequential_id(
    p_project_id uuid,
    p_name text,
    p_description text DEFAULT NULL,
    p_assignee_id uuid DEFAULT NULL,
    p_status_id uuid DEFAULT NULL,
    p_priority task_priority DEFAULT 'Média',
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_progress integer DEFAULT 0
)
RETURNS tasks AS $$
#variable_conflict use_variable
DECLARE
    new_wbs_code text;
    task_count integer;
    new_task tasks;
BEGIN
    -- Contar o número de tarefas existentes no projeto para determinar o próximo número
    -- Esta verificação agora respeita a RLS, o que é seguro.
    SELECT COUNT(*) + 1 INTO task_count FROM public.tasks WHERE project_id = p_project_id;

    -- Formatar o novo wbs_code (ex: TSK-0001)
    new_wbs_code := 'TSK-' || lpad(task_count::text, 4, '0');

    -- Inserir a nova tarefa com o wbs_code gerado
    INSERT INTO public.tasks (
        project_id, name, description, assignee_id, status_id, priority,
        start_date, end_date, progress, wbs_code
    )
    VALUES (
        p_project_id, p_name, p_description, p_assignee_id, p_status_id, p_priority,
        p_start_date, p_end_date, p_progress, new_wbs_code
    )
    RETURNING * INTO new_task;

    RETURN new_task;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- CORRIGIDO

-- 3. REAFIRMAR AS POLÍTICAS DE RLS NA TABELA DE TAREFAS
-- Com as funções auxiliares corrigidas, podemos agora garantir que as políticas
-- que as utilizam funcionarão como esperado.

DROP POLICY IF EXISTS "Colaboradores podem gerenciar tarefas nos seus projetos" ON public.tasks;
DROP POLICY IF EXISTS "Membros do projeto podem ver as tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Membros do projeto podem criar e editar tarefas" ON public.tasks;

CREATE POLICY "Membros do projeto podem gerenciar tarefas"
ON public.tasks
FOR ALL
USING (is_project_member(project_id))
WITH CHECK (is_project_member(project_id));
