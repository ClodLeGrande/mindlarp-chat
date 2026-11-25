import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/misc';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Integration' };

export default async function IntegrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const supabaseHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host;
    } catch {
      return 'not configured';
    }
  })();

  const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;
  const siteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL;
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;

  const rows = [
    {
      title: 'Shared Supabase project',
      body: `This chat signs in against ${supabaseHost} — the same project as the MindLarp site and console. One account works everywhere; chat data lives in the dedicated "chat" schema.`,
      badge: 'active',
    },
    {
      title: 'Google / GitHub sign-in',
      body: 'Direct OAuth with the same regular client ids as mindlarp.com — Supabase OAuth providers are not involved. Accounts are matched by verified email across the site, the console and this chat.',
      badge: 'active',
    },
    {
      title: 'Single sign-on from mindlarp.com',
      body: 'The main site can hand a signed-in session over via a one-time token: it inserts a row into public.sso_handoffs and redirects to /auth/handoff. The chat provisions the matching Supabase user and opens a session — no password crosses the boundary. Setup snippet: docs/SYNC.md.',
      badge: 'ready',
    },
    {
      title: 'Shared statistics',
      body: 'Every request lands in chat.usage_events. The views public.chat_usage_daily, public.chat_usage_totals and public.chat_activity expose the same numbers to the console and the site (team admins see all users).',
      badge: 'active',
    },
    {
      title: 'Cross-subdomain session cookie',
      body: cookieDomain
        ? `Session cookies are scoped to "${cookieDomain}", so the chat and the console share one login on sibling subdomains.`
        : 'Set AUTH_COOKIE_DOMAIN (e.g. ".mindlarp.com") to share one session cookie between the chat and the console on sibling subdomains.',
      badge: cookieDomain ? 'active' : 'optional',
    },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-muted">
        Signed in as <span className="font-medium text-ink">{user.email}</span>.
      </p>

      {rows.map((row) => (
        <section key={row.title} className="rounded-lg border border-line bg-raised p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{row.title}</h2>
            <Badge tone={row.badge === 'optional' ? 'neutral' : 'accent'}>{row.badge}</Badge>
          </div>
          <p className="text-[0.8125rem] leading-relaxed text-muted">{row.body}</p>
        </section>
      ))}

      <div className="flex flex-wrap gap-3 text-sm">
        {consoleUrl && (
          <a href={consoleUrl} className="text-accent hover:underline">
            MindLarp Console ↗
          </a>
        )}
        {siteUrl && (
          <a href={siteUrl} className="text-accent hover:underline">
            mindlarp.com ↗
          </a>
        )}
      </div>
    </div>
  );
}
