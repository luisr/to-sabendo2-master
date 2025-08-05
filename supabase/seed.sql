-- ----------------------------
-- Dados de Exemplo (Seed)
-- ----------------------------

-- Limpa os dados existentes para evitar conflitos (opcional, mas recomendado para testes)
-- A ordem é importante para respeitar as chaves estrangeiras.
DELETE FROM public.task_observations;
DELETE FROM public.baseline_tasks;
DELETE FROM public.project_baselines;
DELETE FROM public.tasks;
DELETE FROM public.project_collaborators;
DELETE FROM public.projects;
DELETE FROM public.users;

-- 1. Inserir Usuários (com base nos dados fornecidos)
-- Os IDs correspondem aos usuários em auth.users.
-- A role 'Admin' é mapeada para 'admin', e as outras para 'member' para corresponder ao ENUM 'user_role'.
INSERT INTO public.users (id, full_name, email, avatar_url, role) VALUES
('5a18de86-1c6d-4120-bd94-e61544d811b7', 'Super Admin', 'admin@example.com', 'SA', 'admin'),
('a25b2ad6-1bf3-404a-a127-9ec841bf44b3', 'Gerente de Projeto', 'gp@example.com', 'GP', 'member'),
('c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a', 'Membro da Equipe', 'membro@example.com', 'ME', 'member')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    updated_at = now();

-- 2. Inserir Projetos
-- O 'owner_id' deve ser um dos IDs de usuário inseridos acima.
-- Usamos um UUID fixo para o projeto para facilitar a referência.
INSERT INTO public.projects (id, name, description, owner_id, start_date, end_date) VALUES
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'Projeto Exemplo: Lançamento do Produto X', 'Este é um projeto de exemplo para demonstrar a funcionalidade da plataforma.', '5a18de86-1c6d-4120-bd94-e61544d811b7', '2024-08-01', '2024-12-20')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    owner_id = EXCLUDED.owner_id,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    updated_at = now();

-- 3. Inserir Colaboradores no Projeto
-- Adicionamos o gerente e o membro da equipe como colaboradores no projeto.
INSERT INTO public.project_collaborators (project_id, user_id) VALUES
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'a25b2ad6-1bf3-404a-a127-9ec841bf44b3'),
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 4. Inserir Tarefas para o Projeto
-- As tarefas são atribuídas aos colaboradores.
INSERT INTO public.tasks (project_id, name, status, priority, start_date, end_date, responsible_id, description, progress) VALUES
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'Fase 1: Planejamento Estratégico', 'Concluído', 'Alta', '2024-08-01 09:00:00+00', '2024-08-15 18:00:00+00', 'a25b2ad6-1bf3-404a-a127-9ec841bf44b3', 'Definir o escopo, objetivos e KPIs do projeto.', 100),
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'Fase 2: Pesquisa de Mercado', 'Em Andamento', 'Alta', '2024-08-16 09:00:00+00', '2024-09-10 18:00:00+00', 'c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a', 'Analisar concorrentes e identificar público-alvo.', 50),
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'Fase 3: Desenvolvimento do Protótipo', 'Pendente', 'Média', '2024-09-11 09:00:00+00', '2024-10-30 18:00:00+00', 'c7b2f1cb-ded8-4c0c-ad58-608dcfe03e1a', 'Criar um protótipo funcional para validação interna.', 0),
('1a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'Fase 4: Lançamento', 'Pendente', 'Alta', '2024-11-01 09:00:00+00', '2024-12-15 18:00:00+00', 'a25b2ad6-1bf3-404a-a127-9ec841bf44b3', 'Coordenar todas as atividades de lançamento.', 0);

-- Fim do script de seed
