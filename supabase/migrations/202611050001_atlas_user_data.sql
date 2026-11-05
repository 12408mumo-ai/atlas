-- Atlas per-user cloud persistence.
-- Run this migration in the Supabase SQL Editor or with Supabase CLI.
-- The app stores its current world state as JSONB to match the existing
-- AtlasState and MemoriesState client models without lossy field mapping.

create table if not exists public.atlas_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  world_state jsonb not null default '{}'::jsonb,
  memories_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atlas_user_data_world_object check (jsonb_typeof(world_state) = 'object'),
  constraint atlas_user_data_memories_object check (jsonb_typeof(memories_state) = 'object')
);

create or replace function public.set_atlas_user_data_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists atlas_user_data_updated_at on public.atlas_user_data;
create trigger atlas_user_data_updated_at
before update on public.atlas_user_data
for each row execute function public.set_atlas_user_data_updated_at();

alter table public.atlas_user_data enable row level security;

-- Users can only read or write the one row whose key is their Supabase Auth id.
drop policy if exists "Users read their Atlas data" on public.atlas_user_data;
create policy "Users read their Atlas data"
on public.atlas_user_data for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users create their Atlas data" on public.atlas_user_data;
create policy "Users create their Atlas data"
on public.atlas_user_data for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update their Atlas data" on public.atlas_user_data;
create policy "Users update their Atlas data"
on public.atlas_user_data for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- These RPCs update only their own JSON column. That avoids one browser tab
-- replacing the other domain's data with a stale copy during simultaneous saves.
create or replace function public.save_atlas_world_state(p_state jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'World state must be a JSON object';
  end if;

  insert into public.atlas_user_data (user_id, world_state)
  values (v_user_id, p_state)
  on conflict (user_id) do update
  set world_state = excluded.world_state;
end;
$$;

create or replace function public.save_atlas_memories_state(p_state jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'Memories state must be a JSON object';
  end if;

  insert into public.atlas_user_data (user_id, memories_state)
  values (v_user_id, p_state)
  on conflict (user_id) do update
  set memories_state = excluded.memories_state;
end;
$$;

revoke all on function public.save_atlas_world_state(jsonb) from public, anon;
revoke all on function public.save_atlas_memories_state(jsonb) from public, anon;
grant execute on function public.save_atlas_world_state(jsonb) to authenticated;
grant execute on function public.save_atlas_memories_state(jsonb) to authenticated;

grant select, insert, update on public.atlas_user_data to authenticated;

comment on table public.atlas_user_data is
  'Private per-user Atlas state. Media files belong in Cloudflare R2; store their object keys or URLs in memories_state.';
