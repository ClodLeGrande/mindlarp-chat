import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { randomToken } from '@/lib/crypto';
import { authorizeRedirectUrl, isOAuthProvider, providerConfig } from '@/lib/oauth';

const STATE_COOKIE = 'ml_oauth_state';

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const fail = (message: string) => {
    const target = new URL('/sign-in', url.origin);
    target.searchParams.set('error', 'oauth');
    target.searchParams.set('message', message);
    return NextResponse.redirect(target);
  };

  if (!isOAuthProvider(provider)) return fail('Unknown provider.');

  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    return fail(`${provider} login is not configured on this deployment.`);
  }

  const state = randomToken(24);
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 600,
    path: '/auth/oauth',
  });

  return NextResponse.redirect(authorizeRedirectUrl(provider, siteUrl, state));
}
