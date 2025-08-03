-- =============================================================================
--  DADOS DE EXEMPLO (SEED) - PROJETO "TO SABENDO"
--  Este script é idempotente e pode ser executado várias vezes sem erros.
--  Execute após a criação do schema, funções e políticas de RLS.
-- =============================================================================

DO $$
DECLARE
    -- UUIDs dos usuários criados no painel de autenticação:
    admin_user_id  uuid := '5a18de86-1c6d-4120-bd94-e61544d811b7';
    gp_user_id     uuid := 'a25b2ad6-1bf3-404a-a127-9ec841bf44b3';
    member_user_id uuid := 'c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a';

    -- IDs para entidades
    project_alpha_id uuid;
    project_beta_id uuid;
    status_todo_id uuid;
    status_inprogress_id uuid;
    status_done_id uuid;
    tag_frontend_id uuid;
    tag_backend_id uuid;
    tag_marketing_id uuid;
    task_planejamento_id uuid;
    task_design_id uuid;
    task_backend_id uuid;

BEGIN
    -- 1. GARANTIR A EXISTÊNCIA DOS PERFIS DE USUÁRIO
    INSERT INTO public.users (id, name, email, role)
    VALUES
        (admin_user_id, 'Super Admin', 'admin@example.com', 'Admin'),
        (gp_user_id, 'Gerente de Projeto', 'gp@example.com', 'Gerente'),
        (member_user_id, 'Membro da Equipe', 'membro@example.com', 'Membro')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- 2. INSERIR STATUS DE TAREFAS
    INSERT INTO public.task_statuses (name, color, display_order) VALUES ('A Fazer', '#808080', 0) ON CONFLICT (name) DO NOTHING RETURNING id INTO status_todo_id;
    INSERT INTO public.task_statuses (name, color, display_order) VALUES ('Em Progresso', '#3b82f6', 1) ON CONFLICT (name) DO NOTHING RETURNING id INTO status_inprogress_id;
    INSERT INTO public.task_statuses (name, color, display_order) VALUES ('Feito', '#22c55e', 2) ON CONFLICT (name) DO NOTHING RETURNING id INTO status_done_id;
    
    -- Capturar IDs caso já existam
    SELECT id INTO status_todo_id FROM public.task_statuses WHERE name = 'A Fazer';
    SELECT id INTO status_inprogress_id FROM public.task_statuses WHERE name = 'Em Progresso';
    SELECT id INTO status_done_id FROM public.task_statuses WHERE name = 'Feito';

    -- 3. INSERIR TAGS
    INSERT INTO public.tags (name, color) VALUES ('Frontend', '#3b82f6') ON CONFLICT (name) DO NOTHING RETURNING id INTO tag_frontend_id;
    INSERT INTO public.tags (name, color) VALUES ('Backend', '#10b981') ON CONFLICT (name) DO NOTHING RETURNING id INTO tag_backend_id;
    INSERT INTO public.tags (name, color) VALUES ('Marketing', '#f97316') ON CONFLICT (name) DO NOTHING RETURNING id INTO tag_marketing_id;

    -- Capturar IDs caso já existam
    SELECT id INTO tag_frontend_id FROM public.tags WHERE name = 'Frontend';
    SELECT id INTO tag_backend_id FROM public.tags WHERE name = 'Backend';
    SELECT id INTO tag_marketing_id FROM public.tags WHERE name = 'Marketing';

    -- 4. INSERIR PROJETOS
    INSERT INTO public.projects (name, description, budget, start_date, end_date) VALUES ('Projeto Alpha', 'Desenvolvimento do novo app mobile.', 50000, '2024-08-01', '2024-10-31') ON CONFLICT (name) DO NOTHING RETURNING id INTO project_alpha_id;
    INSERT INTO public.projects (name, description, budget, start_date, end_date) VALUES ('Projeto Beta', 'Campanha de lançamento para o Q4.', 75000, '2024-09-01', '2024-11-30') ON CONFLICT (name) DO NOTHING RETURNING id INTO project_beta_id;
    
    -- Capturar IDs caso já existam
    SELECT id INTO project_alpha_id FROM public.projects WHERE name = 'Projeto Alpha';
    SELECT id INTO project_beta_id FROM public.projects WHERE name = 'Projeto Beta';

    -- 5. INSERIR COLABORADORES
    INSERT INTO public.collaborators (project_id, user_id, role) VALUES
        (project_alpha_id, gp_user_id, 'Gerente'),
        (project_alpha_id, member_user_id, 'Membro'),
        (project_beta_id, admin_user_id, 'Gerente')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- 6. INSERIR TAREFAS (COM SUBTAREFAS)
    -- Limpar tarefas antigas do projeto para evitar conflitos de WBS
    DELETE FROM public.tasks WHERE project_id = project_alpha_id;
    
    -- Tarefa Pai 1
    INSERT INTO public.tasks (project_id, name, assignee_id, status_id, priority, start_date, end_date, progress, wbs_code)
    VALUES (project_alpha_id, 'Planejamento e Design', gp_user_id, status_inprogress_id, 'Alta', '2024-08-01', '2024-08-10', 50, 'TSK-0001')
    ON CONFLICT (project_id, name) DO NOTHING RETURNING id INTO task_planejamento_id;

    -- Subtarefa 1.1
    INSERT INTO public.tasks (project_id, name, parent_id, assignee_id, status_id, priority, start_date, end_date, progress, wbs_code)
    VALUES (project_alpha_id, 'Design da Interface', task_planejamento_id, member_user_id, status_done_id, 'Média', '2024-08-05', '2024-08-10', 100, 'TSK-0002')
    ON CONFLICT (project_id, name) DO NOTHING RETURNING id INTO task_design_id;
    
    -- Tarefa Pai 2
    INSERT INTO public.tasks (project_id, name, assignee_id, status_id, priority, start_date, end_date, progress, wbs_code)
    VALUES (project_alpha_id, 'Desenvolvimento Backend', gp_user_id, status_todo_id, 'Alta', '2024-08-11', '2024-08-25', 0, 'TSK-0003')
    ON CONFLICT (project_id, name) DO NOTHING RETURNING id INTO task_backend_id;
    
    -- 7. ASSOCIAR TAGS ÀS TAREFAS
    TRUNCATE public.task_tags;
    INSERT INTO public.task_tags (task_id, tag_id) VALUES
        (task_design_id, tag_frontend_id),
        (task_backend_id, tag_backend_id);

END $$;
