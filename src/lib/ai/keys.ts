import 'server-only';

import { decryptSecret } from '@/lib/crypto';
import { ENV_KEY_SOURCES, PROVIDER_LABELS } from '@/lib/models';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Conversation, ProviderKeyRef, ProviderKind } from '@/lib/types';

export interface ResolvedKey {
  keyId: string;
  provider: ProviderKind;
  apiKey: string;
  baseUrl?: string;
}

/** Server-side env keys, offered as "Server default" choices. */
export function envKeyRefs(): ProviderKeyRef[] {
  const refs: ProviderKeyRef[] = [];
  for (const [id, source] of Object.entries(ENV_KEY_SOURCES)) {
    if (process.env[source.envVar]) {
      refs.push({
        id,
        provider: source.provider,
        label: `${PROVIDER_LABELS[source.provider]} · server default`,
        baseUrl: '',
        source: 'env',
      });
    }
  }
  return refs;
}

export async function listKeyRefs(userId: string): Promise<ProviderKeyRef[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('chat')
    .from('provider_keys')
    .select('id, provider, label, base_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const userRefs: ProviderKeyRef[] = (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider as ProviderKind,
    label: row.label || PROVIDER_LABELS[row.provider as ProviderKind],
    baseUrl: row.base_url,
    source: 'user',
  }));

  return [...userRefs, ...envKeyRefs()];
}

/** Resolve the API key a conversation should use. Never leaves the server. */
export async function resolveKey(
  conversation: Pick<Conversation, 'provider_key_id' | 'provider'>,
  defaultKeyId: string | null,
): Promise<ResolvedKey | null> {
  const keyId = conversation.provider_key_id || defaultKeyId;
  if (!keyId) return null;

  const envSource = ENV_KEY_SOURCES[keyId];
  if (envSource) {
    const apiKey = process.env[envSource.envVar];
    if (!apiKey) return null;
    return { keyId, provider: envSource.provider, apiKey };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('chat')
    .from('provider_keys')
    .select('id, provider, base_url, encrypted_key')
    .eq('id', keyId)
    .single();

  if (error || !data) return null;

  return {
    keyId: data.id,
    provider: data.provider as ProviderKind,
    apiKey: decryptSecret(data.encrypted_key),
    baseUrl: data.base_url || undefined,
  };
}

export async function touchKeyUsage(keyId: string) {
  if (ENV_KEY_SOURCES[keyId]) return;
  const admin = createAdminClient();
  await admin
    .schema('chat')
    .from('provider_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}
