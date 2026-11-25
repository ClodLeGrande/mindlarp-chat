-- MindLarp Chat — initial schema.
-- Lives in a dedicated `chat` schema so it can share one Supabase project with
-- mindlarp-site (public.users / sessions / usage_events) and admin-console
-- (public.profiles / projects / tasks) without name collisions.

create schema if not exists chat;

grant usage on schema chat to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type chat.message_role as enum ('user', 'assistant', 'system', 'tool');
create type chat.message_status as enum ('pending', 'streaming', 'complete', 'error', 'stopped');
create type chat.artifact_kind as enum ('presentation', 'pdf', 'document', 'html');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table chat.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  response_language text not null default 'en',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_provider_key_id uuid,
  default_model text not null default '',
  temperature numeric not null default 0.7 check (temperature between 0 and 2),
  max_tokens integer not null default 4096 check (max_tokens between 1 and 200000),
  top_p numeric not null default 1 check (top_p between 0 and 1),
  system_prompt text not null default '',
  agent_mode boolean not null default false,
  enabled_skills text[] not null default '{}',
  send_on_enter boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chat.provider_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'google', 'openai-compatible')),
  label text not null default '',
  base_url text not null default '',
  encrypted_key text not null,
  key_hint text not null default '',
  models jsonb not null default '[]'::jsonb,
  models_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index provider_keys_user_idx on chat.provider_keys (user_id);

alter table chat.settings
  add constraint settings_default_key_fk
  foreign key (default_provider_key_id) references chat.provider_keys (id) on delete set null;

create table chat.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  instructions text not null default '',
  icon text not null default 'folder',
  color text not null default 'cobalt',
  default_model text not null default '',
  default_provider_key_id uuid references chat.provider_keys (id) on delete set null,
  enabled_skills text[] not null default '{}',
  agent_mode boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_idx on chat.projects (user_id, updated_at desc);

create table chat.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references chat.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  extracted_text text not null default '',
  created_at timestamptz not null default now()
);

create index project_files_project_idx on chat.project_files (project_id);

create table chat.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references chat.projects (id) on delete set null,
  title text not null default 'New chat',
  provider text not null default '',
  model text not null default '',
  provider_key_id uuid references chat.provider_keys (id) on delete set null,
  agent_mode boolean not null default false,
  enabled_skills text[] not null default '{}',
  pinned boolean not null default false,
  archived boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_idx on chat.conversations (user_id, last_message_at desc);
create index conversations_project_idx on chat.conversations (project_id);

-- AI SDK message ids are opaque strings (not UUIDs), so keep them as text.
create table chat.messages (
  id text primary key,
  conversation_id uuid not null references chat.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role chat.message_role not null,
  parts jsonb not null default '[]'::jsonb,
  status chat.message_status not null default 'complete',
  provider text not null default '',
  model text not null default '',
  error text not null default '',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on chat.messages (conversation_id, created_at);

create table chat.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  instructions text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_user_idx on chat.skills (user_id);

create table chat.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references chat.conversations (id) on delete cascade,
  message_id text references chat.messages (id) on delete set null,
  kind chat.artifact_kind not null,
  title text not null default 'Untitled',
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index artifacts_user_idx on chat.artifacts (user_id, created_at desc);
create index artifacts_conversation_idx on chat.artifacts (conversation_id);

create table chat.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references chat.conversations (id) on delete set null,
  provider text not null default '',
  model text not null default '',
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  latency_ms integer not null default 0,
  agent_mode boolean not null default false,
  skills text[] not null default '{}',
  status text not null default 'ok',
  created_at timestamptz not null default now()
);

create index usage_events_user_created_idx on chat.usage_events (user_id, created_at desc);
create index usage_events_created_idx on chat.usage_events (created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers & triggers
-- ---------------------------------------------------------------------------
create or replace function chat.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger settings_updated_at before update on chat.settings
  for each row execute function chat.set_updated_at();
create trigger projects_updated_at before update on chat.projects
  for each row execute function chat.set_updated_at();
create trigger conversations_updated_at before update on chat.conversations
  for each row execute function chat.set_updated_at();
create trigger skills_updated_at before update on chat.skills
  for each row execute function chat.set_updated_at();

-- Team admins (admin-console roles) may read chat usage for the whole team.
-- Returns false when the console schema is not present in this project.
create or replace function chat.is_team_admin()
returns boolean language plpgsql security definer set search_path = public, chat stable as $$
begin
  if to_regclass('public.profiles') is null then
    return false;
  end if;
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- Every auth user gets a settings row.
create or replace function chat.handle_new_user()
returns trigger language plpgsql security definer set search_path = chat as $$
begin
  insert into chat.settings (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function chat.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table chat.settings enable row level security;
alter table chat.provider_keys enable row level security;
alter table chat.projects enable row level security;
alter table chat.project_files enable row level security;
alter table chat.conversations enable row level security;
alter table chat.messages enable row level security;
alter table chat.skills enable row level security;
alter table chat.artifacts enable row level security;
alter table chat.usage_events enable row level security;

create policy settings_owner on chat.settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy provider_keys_owner on chat.provider_keys
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_owner on chat.projects
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy project_files_owner on chat.project_files
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy conversations_owner on chat.conversations
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy messages_owner on chat.messages
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy skills_owner on chat.skills
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy artifacts_owner on chat.artifacts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy usage_events_select on chat.usage_events
  for select to authenticated
  using (user_id = auth.uid() or chat.is_team_admin());
create policy usage_events_insert on chat.usage_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant all on all tables in schema chat to authenticated, service_role;
grant all on all sequences in schema chat to authenticated, service_role;
alter default privileges in schema chat grant all on tables to authenticated, service_role;
alter default privileges in schema chat grant all on sequences to authenticated, service_role;

-- The encrypted key column is server-only: clients list keys without it.
revoke select (encrypted_key) on chat.provider_keys from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Storage buckets (private, per-user folders)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('chat-attachments', 'chat-attachments', false),
  ('chat-artifacts', 'chat-artifacts', false),
  ('chat-project-files', 'chat-project-files', false)
on conflict (id) do nothing;

create policy chat_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('chat-attachments', 'chat-artifacts', 'chat-project-files')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy chat_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('chat-attachments', 'chat-artifacts', 'chat-project-files')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy chat_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('chat-attachments', 'chat-artifacts', 'chat-project-files')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy chat_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('chat-attachments', 'chat-artifacts', 'chat-project-files')
    and (storage.foldername(name))[1] = auth.uid()::text
  );