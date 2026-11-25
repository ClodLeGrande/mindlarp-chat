import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { exchangeCodeForProfile, isOAuthProvider } from '@/lib/oauth';
import { openSessionByEmail } from '@/lib/sso';

const STATE_COOKIE = 'ml_oauth_state';

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  const fail = (message: string) => {
    const target = new URL('/sign-in', url.origin);
    target.searchParams.set('error', 'oauth');
    target.searchParams.set('message', message.slice(0, 200));
    return NextResponse.redirect(target);
  };

  if (!isOAuthProvider(provider)) return fail('Unknown provider.');

  const providerError = url.searchParams.get('error');
  if (providerError) {
    return fail(url.searchParams.get('error_description') ?? 'Sign-in was cancelled.');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail('Invalid OAuth state. Please try again.');
  }

  try {
    const profile = await exchangeCodeForProfile(provider, code, siteUrl);
    const session = await openSessionByEmail(profile.email, {
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider,
      providerUserId: profile.providerUserId,
    });
    if (!session.ok) return fail(session.error);
    return NextResponse.redirect(new URL('/chat', url.origin));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'OAuth sign-in failed.');
  }
}
