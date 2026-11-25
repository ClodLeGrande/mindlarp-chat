'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * Sign-in is Google / GitHub only (direct OAuth, see src/lib/oauth.ts).
 * Accounts are provisioned automatically on first OAuth sign-in.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}
