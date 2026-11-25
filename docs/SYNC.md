# Sync: mindlarp.com ↔ admin-console ↔ mindlarp-chat

All three products share **one Supabase project** (production ref
`aqtjjwhjmejpfzaqwuwb`). The chat keeps its data in a dedicated `chat` schema,
so nothing collides with the site's `public.users / sessions / usage_events`
or the console's `public.profiles / projects / tasks`.

| Concern            | Mechanism                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| Accounts           | One identity per person, matched by verified email across all apps.      |
| Chat sign-in       | Direct Google / GitHub OAuth with the site's regular client ids.         |
| Site → chat SSO    | One-time handoff token (`public.sso_handoffs` → `/auth/handoff`).        |
| Chat ↔ console SSO | Same Supabase project; optional shared cookie via `AUTH_COOKIE_DOMAIN`.  |
| Statistics         | `chat.usage_events` + public views readable by the console and the site. |

---

## 1. Apply the chat schema to the shared project

Review the migrations first — this is a shared production database.

```bash
supabase link --project-ref aqtjjwhjmejpfzaqwuwb
supabase db push          # applies supabase/migrations/*
```

`db push` runs only the SQL in `supabase/migrations/` (never `seed.sql`).
The migrations are additive: new `chat` schema, `public.sso_handoffs`,
three public views. They do not touch existing site/console tables.

## 2. Vercel environment (chat)

```
NEXT_PUBLIC_SUPABASE_URL=https://aqtjjwhjmejpfzaqwuwb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key of that project>
SUPABASE_SERVICE_ROLE_KEY=<service role key — server only>
KEY_ENCRYPTION_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_SITE_URL=https://chat.mindlarp.com
NEXT_PUBLIC_CONSOLE_URL=https://console.mindlarp.com
NEXT_PUBLIC_MAIN_SITE_URL=https://mindlarp.com
AUTH_COOKIE_DOMAIN=.mindlarp.com       # optional, see §4

# The SAME regular OAuth client ids/secrets mindlarp.com already uses:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## 3. SSO from mindlarp.com (custom session auth)

The main site uses its own `users` / `sessions` tables, not Supabase Auth.
Bridge it with a one-time token:

1. The site creates a random token, stores **only its SHA-256 hash** in
   `public.sso_handoffs` with a short TTL (60 s is plenty).
2. The site redirects the browser to `https://chat.mindlarp.com/auth/handoff?token=<raw token>`.
3. The chat atomically consumes the row and opens a Supabase session for the
   asserted email (provisioning the user on first sign-in). Replayed or
   expired tokens are rejected.

Drop-in route for **mindlarp-site** (App Router, adapt the session lookup to
your `src/server` helpers):

```js
// app/api/chat-sso/route.js
import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import your existing session helper, e.g.:
// import { getCurrentUser } from '@/src/server/session';

const CHAT_URL = process.env.CHAT_URL ?? 'https://chat.mindlarp.com';

export async function GET(request) {
  const user = await getCurrentUser(request); // site session (users table)
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY, // service role — server only
    { auth: { persistSession: false } },
  );

  const { error } = await supabase.from('sso_handoffs').insert({
    token_hash: tokenHash,
    email: user.email,
    display_name: user.display_name ?? '',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  if (error) return NextResponse.json({ error: 'sso unavailable' }, { status: 500 });

  return NextResponse.redirect(`${CHAT_URL}/auth/handoff?token=${token}`);
}
```

Then add an "Open chat" link on the site pointing at `/api/chat-sso`.
Identity is matched **by email**: the same person lands in the same account.

## 3a. Google / GitHub login — direct OAuth, regular client ids

The chat runs its **own** OAuth flow (`src/lib/oauth.ts`), exactly like
mindlarp.com — Supabase's OAuth providers are **not** used:

1. `/auth/oauth/google` (or `github`) sets a short-lived `state` cookie and
   redirects to the provider with `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID`.
2. The provider returns to `/auth/oauth/<provider>/callback` on the chat's own
   domain; the code is exchanged server-side and the profile fetched
   (GitHub: primary **verified** email via `/user/emails`).
3. `openSessionByEmail()` provisions the Supabase Auth user if needed and
   opens a session with a service-side magic-link token.

One-time setup in the **Google / GitHub OAuth apps** (the same ones the site
uses): add the chat callbacks to the authorized redirect URIs:

```
https://chat.mindlarp.com/auth/oauth/google/callback
https://chat.mindlarp.com/auth/oauth/github/callback
```

No Supabase URL allow-list changes are needed for this flow. Accounts match
the console's Supabase OAuth users **by verified email**, so one person = one
account everywhere.

Recommended hardening in the Supabase dashboard (Authentication → Providers):
disable Email/password for the project if the console also moves to OAuth-only
— the chat UI exposes no password or magic-link sign-in either way.

For **local** testing, set the four client-id/secret vars in `.env.local` and
add `http://localhost:3000/auth/oauth/<provider>/callback` to the OAuth app.

## 4. Shared session cookie with admin-console (optional)

The console uses Supabase Auth on the same project. For _seamless_ SSO on
sibling subdomains (`chat.mindlarp.com`, `console.mindlarp.com`), set in
**both** apps:

```
AUTH_COOKIE_DOMAIN=.mindlarp.com
```

The Supabase session cookie is named after the project ref, so with a shared
cookie domain one login covers both apps. (admin-console needs the same
`cookieOptions.domain` wiring in its `createServerClient` calls.)

## 5. Statistics for the console / site

Every chat request appends to `chat.usage_events`
(user, conversation, provider, model, tokens, latency, agent mode, skills).
RLS: users see their own rows; team admins (`public.profiles.role = 'admin'`)
see everyone's. Three `security_invoker` views expose aggregates in `public`:

```sql
-- per day / user / model
select * from public.chat_usage_daily order by day desc;

-- per user totals
select * from public.chat_usage_totals;

-- conversations / messages / artifacts per user
select * from public.chat_activity;
```

The console can query these views with its existing Supabase client — no new
backend needed. To show chat stats on a dashboard, join with `public.profiles`
on `user_id`.

## 6. Local development

```bash
npm run setup:local     # supabase start (Docker, ports 563xx) + db reset + seed
npm run dev             # http://localhost:3000
npm run mock:provider   # optional fake OpenAI-compatible API on :8787
node scripts/smoke.mjs  # end-to-end check incl. agent PDF + SSO handoff
```

The seeded `demo@mindlarp.local` account exists only for the smoke script
(it signs in at the API level); the product UI is Google/GitHub only.
Local ports: API `56321`, DB `56322`, Studio `56323`, mail `56324`
(admin-console uses `553xx`, so both stacks run side by side).
