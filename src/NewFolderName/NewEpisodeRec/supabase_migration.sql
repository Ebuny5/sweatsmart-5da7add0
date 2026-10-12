-- Per-user memory so insights never repeat. Run once in the Supabase SQL editor
-- (or let Lovable apply it as a migration).
create table if not exists public.user_insight_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_insight_state enable row level security;

create policy "own insight state read"   on public.user_insight_state for select using (auth.uid() = user_id);
create policy "own insight state insert" on public.user_insight_state for insert with check (auth.uid() = user_id);
create policy "own insight state update" on public.user_insight_state for update using (auth.uid() = user_id);
