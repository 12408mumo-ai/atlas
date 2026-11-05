-- Atlas per-user app data.
-- Run this migration in the Supabase SQL Editor or with Supabase CLI.
-- Structured Atlas data stays JSONB to match the existing application models.
-- Binary photos/audio/video belong in Cloudflare R2, not PostgreSQL.

create table if not exists public.atlas_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  world_state jsonb not null default '{}'::jsonb,
  memories_state jsonb not null default '{}'::jsonb,
  assistant_chat jsonb not null default '[]'::jsonb,
  assistant_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atlas_user_data_world_object check (jsonb_typeof(world_state) = 'object'),
  constraint atlas_user_data_memories_object check (jsonb_typeof(memories_state) = 'object')
);

-- Keep this script safe to re-run against the earlier Atlas migration too.
alter table public.atlas_user_data
  add column if not exists assistant_chat jsonb not null default '[]'::jsonb,
  add column if not exists assistant_preferences jsonb not null default '{}'::jsonb;

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

-- Store object references and metadata here; file bytes are held in Cloudflare R2.
create table if not exists public.atlas_media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  object_key text not null unique,
  memory_entry_id text,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

alter table public.atlas_media_assets enable row level security;

drop policy if exists "Users manage their Atlas media metadata" on public.atlas_media_assets;
create policy "Users manage their Atlas media metadata"
on public.atlas_media_assets for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- These RPCs update only one JSON column at a time, so concurrent changes
-- to Work and Memories or chat do not overwrite each other.
create or replace function public.save_atlas_world_state(p_state jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'World state must be a JSON object';
  end if;
  insert into public.atlas_user_data (user_id, world_state)
  values (v_user_id, p_state)
  on conflict (user_id) do update set world_state = excluded.world_state;
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
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'Memories state must be a JSON object';
  end if;
  insert into public.atlas_user_data (user_id, memories_state)
  values (v_user_id, p_state)
  on conflict (user_id) do update set memories_state = excluded.memories_state;
end;
$$;

create or replace function public.save_atlas_assistant_chat(p_chat jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_chat is null or jsonb_typeof(p_chat) <> 'array' then
    raise exception 'Assistant chat must be a JSON array';
  end if;
  insert into public.atlas_user_data (user_id, assistant_chat)
  values (v_user_id, p_chat)
  on conflict (user_id) do update set assistant_chat = excluded.assistant_chat;
end;
$$;

create or replace function public.save_atlas_assistant_preferences(p_preferences jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Assistant preferences must be a JSON object';
  end if;
  insert into public.atlas_user_data (user_id, assistant_preferences)
  values (v_user_id, p_preferences)
  on conflict (user_id) do update set assistant_preferences = excluded.assistant_preferences;
end;
$$;

revoke all on function public.save_atlas_world_state(jsonb) from public, anon;
revoke all on function public.save_atlas_memories_state(jsonb) from public, anon;
revoke all on function public.save_atlas_assistant_chat(jsonb) from public, anon;
revoke all on function public.save_atlas_assistant_preferences(jsonb) from public, anon;
grant execute on function public.save_atlas_world_state(jsonb) to authenticated;
grant execute on function public.save_atlas_memories_state(jsonb) to authenticated;
grant execute on function public.save_atlas_assistant_chat(jsonb) to authenticated;
grant execute on function public.save_atlas_assistant_preferences(jsonb) to authenticated;

grant select, insert, update on public.atlas_user_data to authenticated;
grant select, insert, update, delete on public.atlas_media_assets to authenticated;

comment on table public.atlas_user_data is
  'Private per-user Atlas content and preferences. API secrets and auth sessions are deliberately excluded.';
comment on table public.atlas_media_assets is
  'Private metadata and Cloudflare R2 object keys; binary media is stored in R2.';
