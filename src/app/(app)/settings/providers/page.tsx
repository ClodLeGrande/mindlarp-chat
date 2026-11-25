import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ProvidersManager } from '@/components/settings/providers-manager';
import { envKeyRefs } from '@/lib/ai/keys';
import { createClient } from '@/lib/supabase/server';
import type { ProviderKey } from '@/lib/types';

export const metadata: Metadata = { title: 'Providers & keys' };

export default async function ProvidersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // encrypted_key is intentionally excluded (column privilege revoked).
  const { data: keys } = await supabase
    .schema('chat')
    .from('provider_keys')
    .select(
      'id, user_id, provider, label, base_url, key_hint, models, models_fetched_at, created_at, last_used_at',
    )
    .order('created_at');

  return <ProvidersManager keys={(keys ?? []) as ProviderKey[]} envRefs={envKeyRefs()} />;
}
