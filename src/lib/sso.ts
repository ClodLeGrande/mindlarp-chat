import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Open a Supabase session for an email asserted by a trusted server-side flow
 * (direct OAuth or the site's SSO handoff). Provisions the user on first sign
 * in; no password ever crosses the boundary.
 */
export async function openSessionByEmail(
  email: string,
  profile: { name?: string; avatarUrl?: string; provider?: string; providerUserId?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  let link = await admin.auth.admin.generateLink({ type: 'magiclink', email: normalized });
  if (link.error) {
    const { error: createError } = await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: {
        full_name: profile.name ?? '',
        avatar_url: profile.avatarUrl ?? '',
        ...(profile.provider && profile.providerUserId
          ? { [`${profile.provider}_id`]: profile.providerUserId }
          : {}),
      },
    });
    if (createError) return { ok: false, error: createError.message };
    link = await admin.auth.admin.generateLink({ type: 'magiclink', email: normalized });
    if (link.error) return { ok: false, error: link.error.message };
  }

  // Keep display metadata fresh for returning users.
  const user = link.data.user;
  if (user && (profile.name || profile.avatarUrl || profile.providerUserId)) {
    const metadata = { ...user.user_metadata };
    if (profile.name && !metadata.full_name) metadata.full_name = profile.name;
    if (profile.avatarUrl) metadata.avatar_url = profile.avatarUrl;
    if (profile.provider && profile.providerUserId) {
      metadata[`${profile.provider}_id`] = profile.providerUserId;
    }
    await admin.auth.admin.updateUserById(user.id, { user_metadata: metadata });
  }

  const hashedToken = link.data.properties?.hashed_token;
  if (!hashedToken) return { ok: false, error: 'Could not issue a session token.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: hashedToken });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
