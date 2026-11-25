-- Local development seed. NEVER run against the shared cloud project.
-- Demo account: demo@mindlarp.local / demo-password-123

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@mindlarp.local',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Demo User"}'::jsonb,
  now(),
  now(),
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'demo@mindlarp.local',
  format(
    '{"sub":"%s","email":"%s","email_verified":true}',
    '00000000-0000-0000-0000-000000000001',
    'demo@mindlarp.local'
  )::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict do nothing;

insert into chat.settings (user_id, display_name, default_model)
values ('00000000-0000-0000-0000-000000000001', 'Demo User', 'gpt-5.2')
on conflict (user_id) do nothing;

insert into chat.projects (id, user_id, name, description, instructions, icon, color)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'Getting started',
  'A sample project to explore MindLarp Chat.',
  'You are helping with the MindLarp product. Be concise and practical.',
  'sparkles',
  'cobalt'
)
on conflict (id) do nothing;