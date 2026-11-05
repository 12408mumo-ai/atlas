-- Atlas backend services: profiles, PDF timetable import jobs, reminders and Realtime.
-- Supabase Auth owns credentials/sessions. R2 owns file bytes; this database stores keys/metadata.
-- User content remains in atlas_user_data JSONB columns so the existing app sync stays compatible.

-- Never let a provider secret drift into the database preferences document.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'atlas_user_data_preferences_no_api_key'
      and conrelid = 'public.atlas_user_data'::regclass
  ) then
    alter table public.atlas_user_data
      add constraint atlas_user_data_preferences_no_api_key
      check (
        not (assistant_preferences ? 'apiKey')
        and not (assistant_preferences ? 'api_key')
      );
  end if;
end;
$$;

-- Public profile data is separate from Supabase Auth credentials.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_object_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
on public.profiles for select to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
grant select, update on public.profiles to authenticated;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, new.phone, 'Atlas user'), '@', 1)
  );
  insert into public.profiles (user_id, display_name)
  values (new.id, v_name)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_atlas_profile on auth.users;
create trigger on_auth_user_created_atlas_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

-- Backfill profiles for accounts that existed before this migration.
insert into public.profiles (user_id, display_name)
select
  id,
  coalesce(
    nullif(raw_user_meta_data ->> 'name', ''),
    nullif(raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(email, phone, 'Atlas user'), '@', 1)
  )
from auth.users
on conflict (user_id) do nothing;

-- A job row describes a PDF in R2. An Edge Function extracts timetable slots
-- and writes the result/status; the PDF itself is never stored in Postgres.
create table if not exists public.timetable_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_object_key text not null,
  file_name text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'complete', 'failed')),
  extracted_slots jsonb not null default '[]'::jsonb
    check (jsonb_typeof(extracted_slots) = 'array'),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timetable_import_jobs_user_created_idx
  on public.timetable_import_jobs (user_id, created_at desc);
create index if not exists timetable_import_jobs_queue_idx
  on public.timetable_import_jobs (status, created_at)
  where status in ('queued', 'processing');

alter table public.timetable_import_jobs enable row level security;
drop policy if exists "Users read their timetable imports" on public.timetable_import_jobs;
create policy "Users read their timetable imports"
on public.timetable_import_jobs for select to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users queue their own timetable imports" on public.timetable_import_jobs;
create policy "Users queue their own timetable imports"
on public.timetable_import_jobs for insert to authenticated
with check (auth.uid() = user_id and status = 'queued');
drop policy if exists "Users cancel queued timetable imports" on public.timetable_import_jobs;
create policy "Users cancel queued timetable imports"
on public.timetable_import_jobs for delete to authenticated
using (auth.uid() = user_id and status = 'queued');
grant select, insert, delete on public.timetable_import_jobs to authenticated;
grant select, insert, update, delete on public.timetable_import_jobs to service_role;

-- Notification outbox: the SQL job queues due items; an Edge Function can
-- deliver them (web push/email) and mark them sent using its server-only role.
create table if not exists public.atlas_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('task_due', 'assignment_due')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  due_on date not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  dedupe_key text not null,
  unique (user_id, dedupe_key)
);

create index if not exists atlas_notification_outbox_queue_idx
  on public.atlas_notification_outbox (status, created_at)
  where status = 'queued';
create index if not exists atlas_notification_outbox_user_idx
  on public.atlas_notification_outbox (user_id, created_at desc);

alter table public.atlas_notification_outbox enable row level security;
drop policy if exists "Users read their own notifications" on public.atlas_notification_outbox;
create policy "Users read their own notifications"
on public.atlas_notification_outbox for select to authenticated
using (auth.uid() = user_id);
grant select on public.atlas_notification_outbox to authenticated;
grant select, insert, update, delete on public.atlas_notification_outbox to service_role;

-- Run every 15 minutes from pg_cron. It queues reminders due today or tomorrow;
-- a unique key prevents duplicate reminders across repeated cron runs.
create or replace function public.enqueue_due_atlas_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner record;
  v_project jsonb;
  v_task jsonb;
  v_assignment jsonb;
  v_due date;
  v_added integer;
  v_total integer := 0;
  v_projects jsonb;
  v_assignments jsonb;
begin
  for v_owner in
    select user_id, world_state from public.atlas_user_data
  loop
    v_projects := case
      when jsonb_typeof(v_owner.world_state -> 'projects') = 'array'
        then v_owner.world_state -> 'projects'
      else '[]'::jsonb
    end;
    for v_project in select value from jsonb_array_elements(v_projects) as item(value)
    loop
      for v_task in
        select value
        from jsonb_array_elements(
          case when jsonb_typeof(v_project -> 'tasks') = 'array'
            then v_project -> 'tasks' else '[]'::jsonb end
        ) as item(value)
      loop
        if coalesce(v_task ->> 'done', 'false') <> 'true'
          and coalesce(v_task ->> 'due', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          begin
            v_due := (v_task ->> 'due')::date;
          exception when others then
            v_due := null;
          end;
          if v_due is not null and v_due between p_now::date and (p_now::date + 1) then
            insert into public.atlas_notification_outbox
              (user_id, event_type, title, body, payload, due_on, dedupe_key)
            values (
              v_owner.user_id,
              'task_due',
              coalesce(nullif(v_task ->> 'title', ''), 'Project task due'),
              coalesce(nullif(v_task ->> 'title', ''), 'A project task') || ' is due ' || v_due::text,
              jsonb_build_object(
                'projectId', v_project ->> 'id',
                'projectName', v_project ->> 'name',
                'taskId', v_task ->> 'id'
              ),
              v_due,
              'task:' || coalesce(v_task ->> 'id', md5(v_task::text)) || ':' || v_due::text
            )
            on conflict (user_id, dedupe_key) do nothing;
            get diagnostics v_added = row_count;
            v_total := v_total + v_added;
          end if;
        end if;
      end loop;
    end loop;

    v_assignments := case
      when jsonb_typeof(v_owner.world_state -> 'assignments') = 'array'
        then v_owner.world_state -> 'assignments'
      else '[]'::jsonb
    end;
    for v_assignment in select value from jsonb_array_elements(v_assignments) as item(value)
    loop
      if coalesce(v_assignment ->> 'status', 'open') = 'open'
        and coalesce(v_assignment ->> 'due', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        begin
          v_due := (v_assignment ->> 'due')::date;
        exception when others then
          v_due := null;
        end;
        if v_due is not null and v_due between p_now::date and (p_now::date + 1) then
          insert into public.atlas_notification_outbox
            (user_id, event_type, title, body, payload, due_on, dedupe_key)
          values (
            v_owner.user_id,
            'assignment_due',
            coalesce(nullif(v_assignment ->> 'title', ''), 'Study deadline due'),
            coalesce(nullif(v_assignment ->> 'title', ''), 'A study deadline') || ' is due ' || v_due::text,
            jsonb_build_object(
              'assignmentId', v_assignment ->> 'id',
              'subject', v_assignment ->> 'course',
              'kind', v_assignment ->> 'kind'
            ),
            v_due,
            'assignment:' || coalesce(v_assignment ->> 'id', md5(v_assignment::text)) || ':' || v_due::text
          )
          on conflict (user_id, dedupe_key) do nothing;
          get diagnostics v_added = row_count;
          v_total := v_total + v_added;
        end if;
      end if;
    end loop;
  end loop;
  return v_total;
end;
$$;

-- Only the database scheduler and trusted server-side functions may queue reminders.
revoke all on function public.enqueue_due_atlas_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_due_atlas_reminders(timestamptz) to service_role;

-- Enable the optional Supabase pg_cron scheduler when available. If the project
-- does not permit pg_cron, this block leaves a notice; schedule the function in
-- Supabase Dashboard > Integrations > Cron instead.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      execute 'create extension if not exists pg_cron with schema pg_catalog';
      perform cron.unschedule(jobid)
        from cron.job
        where jobname = 'atlas_due_reminders';
      perform cron.schedule(
        'atlas_due_reminders',
        '*/15 * * * *',
        'select public.enqueue_due_atlas_reminders();'
      );
    exception when others then
      raise notice 'pg_cron could not be configured automatically. Schedule public.enqueue_due_atlas_reminders() every 15 minutes in Supabase Cron. Detail: %', sqlerrm;
    end;
  else
    raise notice 'pg_cron is unavailable. Schedule public.enqueue_due_atlas_reminders() every 15 minutes in Supabase Cron.';
  end if;
end;
$$;

-- Make authenticated row changes available through Supabase Realtime.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array[
      'atlas_user_data',
      'profiles',
      'atlas_media_assets',
      'timetable_import_jobs',
      'atlas_notification_outbox'
    ] loop
      if to_regclass('public.' || v_table) is not null
        and not exists (
          select 1 from pg_publication_tables
          where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = v_table
        ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  else
    raise notice 'supabase_realtime publication was not found; enable Realtime for Atlas tables in the Supabase dashboard.';
  end if;
end;
$$;

comment on table public.profiles is 'Non-secret display profile linked to Supabase Auth.';
comment on table public.timetable_import_jobs is 'PDF timetable import metadata and extraction result; source PDF lives in Cloudflare R2.';
comment on table public.atlas_notification_outbox is 'Reminder queue for a trusted Edge Function to deliver.';
