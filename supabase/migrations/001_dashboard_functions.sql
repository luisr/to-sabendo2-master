-- Funções para o Dashboard do Super Admin

-- 1. Função para buscar os KPIs consolidados de todos os projetos
create or replace function get_consolidated_kpis()
returns table (
    total_projects bigint,
    total_budget numeric,
    overall_progress double precision,
    total_tasks bigint,
    completed_tasks bigint,
    tasks_at_risk bigint
)
language plpgsql
as $$
begin
    return query
    select
        (select count(*) from public.projects) as total_projects,
        (select sum(budget) from public.projects) as total_budget,
        (select avg(progress) from public.tasks where progress is not null) as overall_progress,
        (select count(*) from public.tasks) as total_tasks,
        (select count(*) from public.tasks where status_id = (select id from public.task_statuses where name = 'Feito' limit 1)) as completed_tasks,
        (select count(*) from public.tasks where end_date < now() and status_id != (select id from public.task_statuses where name = 'Feito' limit 1)) as tasks_at_risk;
end;
$$;


-- 2. Função para buscar os projetos modificados mais recentemente
create or replace function get_recent_projects()
returns table (
    id uuid,
    name text,
    description text,
    budget numeric,
    spent numeric,
    start_date date,
    end_date date,
    created_at timestamptz
)
language plpgsql
as $$
begin
    return query
    select
        p.id,
        p.name,
        p.description,
        p.budget,
        p.spent,
        p.start_date,
        p.end_date,
        p.created_at
    from public.projects p
    order by p.created_at desc
    limit 5;
end;
$$;

-- 3. Função para buscar as tarefas criadas mais recentemente
create or replace function get_recent_tasks()
returns setof public.tasks
language plpgsql
as $$
begin
    return query
    select *
    from public.tasks
    order by created_at desc
    limit 5;
end;
$$;


-- 4. Função para contar tarefas por status para a visão consolidada
create or replace function get_tasks_by_status_consolidated()
returns table (
    status_name text,
    count bigint
)
language plpgsql
as $$
begin
    return query
    select
        ts.name as status_name,
        count(t.id) as count
    from public.task_statuses ts
    left join public.tasks t on ts.id = t.status_id
    group by ts.name
    order by ts.display_order;
end;
$$;
