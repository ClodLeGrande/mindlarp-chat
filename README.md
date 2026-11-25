# MindLarp Chat

A minimal, full-featured chat interface for your AI models — part of the
MindLarp workspace (site + console + chat on one Supabase project).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
Supabase (Auth, Postgres, Storage) · Vercel AI SDK 7 · deployed on Vercel.

## Features

- **Chat** — streaming responses, Markdown + code highlighting, reasoning
  traces, attachments (images and files), stop / regenerate / copy, pinned and
  searchable history, per-chat model selection.
- **Projects** — group chats around a goal with shared instructions, knowledge
  files (text extracted for the model) and per-project defaults.
- **Agent mode** — the model chains up to 12 tool steps and produces real files.
- **Skills** — built-in capability packs plus your own instruction packs:
  - Presentations → downloadable **PPTX**
  - PDF documents → typeset **PDF** (Unicode / Cyrillic safe)
  - Word documents → editable **DOCX**
  - HTML & visuals → self-contained pages with sandboxed preview
- **Advanced settings** — BYOK provider keys (OpenAI, Anthropic, Google, any
  OpenAI-compatible endpoint: DeepSeek, Moonshot, GLM, OpenRouter, Ollama…),
  encrypted at rest with AES-256-GCM; live model catalogs; temperature / top-p /
  max tokens / global system prompt; response language; theme; data export and
  full data deletion.
- **Usage** — per-request token / latency statistics, shared with the console.
- **Sync** — one account with the MindLarp site and console. Sign-in is
  **Google / GitHub only**, via direct OAuth with the same regular client ids
  as mindlarp.com (no Supabase OAuth providers, no passwords). One-time-token
  SSO from the site; shared usage views. See [docs/SYNC.md](docs/SYNC.md).

Design: editorial monochrome (paper / ink + one cobalt accent), Instrument
Serif display type, Geist body/mono. Light + dark. UI language: English.

## Quick start (local)

Prerequisites: Node ≥ 20.9, Docker.

```bash
npm install
cp .env.example .env.local        # then fill in the values printed by db:start
npm run setup:local               # Supabase in Docker (ports 563xx) + migrations + seed
npm run dev                       # http://localhost:3000
```

Sign-in is Google/GitHub only — set `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID`
(+ secrets) in `.env.local` to test it locally. The seeded
`demo@mindlarp.local` account is used by the smoke script at the API level.

Local Supabase: API `http://127.0.0.1:56321`, Studio `http://127.0.0.1:56323`,
DB `postgres://postgres:postgres@127.0.0.1:56322/postgres`. Ports are offset
from admin-console (`553xx`) so both stacks run simultaneously.

### Chat without real API keys

```bash
npm run mock:provider             # OpenAI-compatible mock on :8787
```

Add a key in **Settings → Providers**: type _OpenAI-compatible_, base URL
`http://localhost:8787/v1`, any key, model `mock-1`. Ask for a "PDF report"
with Agent mode on to exercise the full tool loop.

### End-to-end check

```bash
node scripts/smoke.mjs
```

Signs in the demo user, streams a chat, verifies persistence + usage, runs an
agent request that must produce a downloadable PDF, and tests the SSO handoff
(including replay rejection).

## Scripts

| Script                  | Purpose                               |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Next.js dev server                    |
| `npm run build`         | Production build                      |
| `npm run lint`          | ESLint (next/core-web-vitals + TS)    |
| `npm run typecheck`     | `tsc --noEmit`                        |
| `npm test`              | Vitest unit tests                     |
| `npm run format`        | Prettier                              |
| `npm run db:start/stop` | Local Supabase stack                  |
| `npm run db:reset`      | Recreate local DB + migrations + seed |
| `npm run setup:local`   | `db:start` + `db:reset`               |
| `npm run mock:provider` | Local mock OpenAI-compatible API      |

## Deploy (Vercel)

1. Push this repo and import it in Vercel.
2. Set the environment variables from `.env.example` (production Supabase
   project = the one used by mindlarp-site / admin-console).
3. Apply the migrations to the shared project — see
   [docs/SYNC.md §1](docs/SYNC.md). **Never run `seed.sql` against production.**
4. `maxDuration` is already configured for `/api/chat` (300 s).

### Domain: chat.mindlarp.com

1. Vercel → project → **Settings → Domains** → add `chat.mindlarp.com`.
2. At your DNS provider add the record Vercel shows — typically
   `CNAME chat → cname.vercel-dns.com`. Wait for the certificate (automatic).
3. Set in Vercel env: `NEXT_PUBLIC_SITE_URL=https://chat.mindlarp.com`
   (and `AUTH_COOKIE_DOMAIN=.mindlarp.com` for a shared session with the
   console), then redeploy.
4. In the **same Google / GitHub OAuth apps the site uses**, add redirect URIs:
   - `https://chat.mindlarp.com/auth/oauth/google/callback`
   - `https://chat.mindlarp.com/auth/oauth/github/callback`

No code changes are needed — the app derives all callback URLs from
`NEXT_PUBLIC_SITE_URL`.

## Connecting OpenAI / Anthropic (provider keys)

Two ways, both already built in:

**Per-user (BYOK):** the user opens **Settings → Providers & keys → Add key**,
picks OpenAI / Anthropic / Google / OpenAI-compatible, pastes the API key and
saves. Keys come from:

- OpenAI — <https://platform.openai.com/api-keys> (create secret key, `sk-…`)
- Anthropic — <https://console.anthropic.com/settings/keys>

Press **Models** on a key to fetch the live catalog, then pick a model in the
chat composer or set a default in **Settings → Generation**. Keys are encrypted
with AES-256-GCM (`KEY_ENCRYPTION_SECRET`) and never returned to the browser;
requests go server → provider directly.

**Server-wide:** set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` /
`GOOGLE_GENERATIVE_AI_API_KEY` in the deployment env — every user then sees a
"Server default" provider option without adding their own key.

## Structure

```
src/
  app/
    (auth)/            sign-in / sign-up
    (app)/             chat, projects, skills, usage, settings (session-guarded)
    auth/              direct OAuth (google/github), SSO handoff, sign-out
    api/               chat streaming, artifact downloads
  components/          UI primitives + feature components
  lib/
    ai/                providers, keys, system prompt, tools (pptx/pdf/docx/html)
    actions/           server actions (conversations, projects, skills, keys, settings)
    supabase/          browser / server / admin / middleware clients
    chat-store.ts      message persistence, attachments, usage recording
    crypto.ts          AES-256-GCM key encryption, handoff hashing
supabase/
  migrations/          chat schema + RLS + storage + integration views
  seed.sql             local demo data only
scripts/               mock provider + E2E smoke test
docs/SYNC.md           site / console integration guide
```

## Security notes

- Provider keys are encrypted server-side (AES-256-GCM, `KEY_ENCRYPTION_SECRET`)
  and the ciphertext column is not readable by client roles.
- All chat tables have row-level security keyed to `auth.uid()`.
- Storage buckets are private; objects live under per-user folders and are
  served through short-lived signed URLs.
- HTML artifacts preview in a sandboxed iframe (`allow-scripts`, no
  `allow-same-origin`).
- SSO handoff tokens are stored hashed, single-use, and expire in 60 s.
