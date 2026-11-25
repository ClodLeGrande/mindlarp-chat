-- MindLarp Chat — integration with mindlarp-site and admin-console.
--
-- 1. `public.sso_handoffs` lets the main site (custom session auth) hand a
--    signed-in user over to the chat (Supabase Auth) with a one-time token.
--    Only the service role may touch this table.
-- 2. Public views expose chat usage to the console / site dashboards.
--    `security_invoker = true` keeps the underlying RLS in force, so regular
--    users see only their own numbers and team admins see everything.

-- ---------------------------------------------------------------------------
-- SSO handoff tokens (site -> chat)
-- ---------------------------------------------------------------------------
create table public.sso_handoffs (
  token_hash text primary key,
  email text not null,
  display_name text not null default '',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index sso_handoffs_expires_idx on public.sso_handoffs (expires_at);

alter table public.sso_handoffs enable row level security;
-- No policies: anon and authenticated are denied; service role bypasses RLS.

-- ---------------------------------------------------------------------------
-- Usage views for the console / site
-- ---------------------------------------------------------------------------
create view public.chat_usage_daily
with (security_invoker = true) as
select
  date_trunc('day', created_at)::date as day,
  user_id,
  provider,
  model,
  count(*) as requests,
  sum(prompt_tokens) as prompt_tokens,
  sum(completion_tokens) as completion_tokens,
  sum(total_tokens) as total_tokens,
  avg(latency_ms)::integer as avg_latency_ms,
  count(*) filter (where agent_mode) as agent_requests
from chat.usage_events
group by 1, 2, 3, 4;

create view public.chat_usage_totals
with (security_invoker = true) as
select
  user_id,
  count(*) as requests,
  sum(prompt_tokens) as prompt_tokens,
  sum(completion_tokens) as completion_tokens,
  sum(total_tokens) as total_tokens,
  count(distinct model) as models_used,
  min(created_at) as first_used_at,
  max(created_at) as last_used_at
from chat.usage_events
group by user_id;

create view public.chat_activity
with (security_invoker = true) as
select
  u.id as user_id,
  count(distinct c.id) as conversations,
  count(distinct m.id) as messages,
  count(distinct a.id) as artifacts,
  max(c.last_message_at) as last_chat_at
from chat.conversations c
join auth.users u on u.id = c.user_id
left join chat.messages m on m.conversation_id = c.id
left join chat.artifacts a on a.user_id = c.user_id
group by u.id;

grant select on public.chat_usage_daily to authenticated, service_role;
grant select on public.chat_usage_totals to authenticated, service_role;
grant select on public.chat_activity to authenticated, service_role;