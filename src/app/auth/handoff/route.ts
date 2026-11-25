import { NextResponse } from 'next/server';

import { sha256Hex } from '@/lib/crypto';
import { openSessionByEmail } from '@/lib/sso';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * SSO entry point from mindlarp.com (custom session auth).
 *
 * The site inserts a one-time token into public.sso_handoffs (service role)
 * and redirects the browser here. We consume the token and open a Supabase
 * session for the asserted email — no password crosses the boundary.
 * See docs/SYNC.md for the site side.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const fail = () => NextResponse.redirect(new URL('/sign-in?error=sso', url.origin));

  if (!token) return fail();

  const admin = createAdminClient();
  const tokenHash = sha256Hex(token);

  // Atomically claim the token: only the first request sees a returned row.
  const { data: handoff, error } = await admin
    .from('sso_handoffs')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('email, display_name')
    .maybeSingle();

  if (error || !handoff) return fail();

  const session = await openSessionByEmail(handoff.email, { name: handoff.display_name });
  if (!session.ok) return fail();

  // Opportunistic cleanup of expired handoffs.
  await admin.from('sso_handoffs').delete().lt('expires_at', new Date().toISOString());

  return NextResponse.redirect(new URL('/chat', url.origin));
}
