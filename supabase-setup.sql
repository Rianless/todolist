create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
alter table if exists public.todos enable row level security;

revoke all on table public.app_state from anon, authenticated;
grant all on table public.app_state to service_role;

do $$
begin
  if to_regclass('public.todos') is not null then
    revoke all on table public.todos from anon, authenticated;
    grant all on table public.todos to service_role;
  end if;
end $$;
