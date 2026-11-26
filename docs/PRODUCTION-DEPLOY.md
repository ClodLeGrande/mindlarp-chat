# MindLarp Chat — production deployment

## Vercel project

The Vercel project has been created:

- Project: `mindlarp-chat`
- Project ID: `prj_ZaBH04yVTOXTm34ejeRFI6d9IFhY`
- Domain attached: `chat.mindlarp.com` (Vercel currently reports it as verified)
- Node.js: 22.x

The repository is private and owned by a GitHub organization. Vercel Hobby rejected the Git integration with `repo_owned_by_org`. To keep the repository private and avoid upgrading the plan, deployment is configured through GitHub Actions + Vercel CLI instead of Vercel's Git integration.

## GitHub Actions secrets

In GitHub → `ClodLeGrande/mindlarp-chat` → Settings → Secrets and variables → Actions, add:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | Create a token in Vercel Account Settings → Tokens |
| `VERCEL_ORG_ID` | `team_jW3JoOZpVXAEPrvRhGD7i1kc` |
| `VERCEL_PROJECT_ID` | `prj_ZaBH04yVTOXTm34ejeRFI6d9IFhY` |

Never commit the Vercel token to the repository. The workflow deploys only on pushes to `main` or when manually started from Actions.

## Required Vercel production environment

The following public configuration and OAuth client IDs have already been added to the project:

- `NEXT_PUBLIC_SITE_URL=https://chat.mindlarp.com`
- `NEXT_PUBLIC_CONSOLE_URL=https://console.mindlarp.com`
- `NEXT_PUBLIC_MAIN_SITE_URL=https://mindlarp.com`
- `AUTH_COOKIE_DOMAIN=.mindlarp.com`
- Google, GitHub, and Discord client IDs

Before the first deployment, add the missing secret values in Vercel → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KEY_ENCRYPTION_SECRET` (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_SECRET`
- `DISCORD_CLIENT_SECRET`

Use the **same Supabase project that contains the chat schema and is shared with the console**. The project reference in the current repository docs is `aqtjjwhjmejpfzaqwuwb`; verify this in Supabase before copying keys, because the connected Supabase workspace currently shows a different project.

## OAuth callback URLs

Add these exact URLs to the respective provider applications:

- Google OAuth client: `https://chat.mindlarp.com/auth/oauth/google/callback`
- GitHub OAuth app: `https://chat.mindlarp.com/auth/oauth/github/callback`
- Discord Developer Portal → OAuth2 → Redirects: `https://chat.mindlarp.com/auth/oauth/discord/callback`

Discord must grant the `identify` and `email` scopes. The user must have a verified Discord email; account matching is by verified email.

## Database migrations

Review `supabase/migrations/` first. The chat migrations add the `chat` schema and SSO handoff objects to the shared project. Apply them only to the confirmed shared production Supabase project. Do not run `seed.sql` against production.

## Domain

The domain `chat.mindlarp.com` is already attached to the Vercel project and Vercel reports it as verified. If DNS still needs adjustment, use the exact DNS record Vercel displays under Project → Settings → Domains; do not guess the record value.

Once environment variables and migrations are complete, merge the PR to `main` and run the `Deploy Chat to Vercel` workflow. Then test all three OAuth providers and the site-to-chat handoff.
