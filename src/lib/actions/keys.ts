'use server';

import { revalidatePath } from 'next/cache';

import { failure, type ActionResult } from '@/lib/action-result';
import { fetchRemoteModels } from '@/lib/ai/providers';
import { requireUser } from '@/lib/auth';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { PROVIDER_LABELS } from '@/lib/models';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CatalogModel, ProviderKind } from '@/lib/types';
import { maskKey } from '@/lib/utils';

export interface AddKeyInput {
  provider: ProviderKind;
  label: string;
  baseUrl: string;
  apiKey: string;
}

export async function addProviderKey(input: AddKeyInput): Promise<ActionResult<string>> {
  try {
    const { supabase, user } = await requireUser();
    const apiKey = input.apiKey.trim();
    if (!apiKey) throw new Error('API key is required.');
    if (input.provider === 'openai-compatible' && !input.baseUrl.trim()) {
      throw new Error('Base URL is required for OpenAI-compatible providers.');
    }

    const { data, error } = await supabase
      .schema('chat')
      .from('provider_keys')
      .insert({
        user_id: user.id,
        provider: input.provider,
        label: input.label.trim() || PROVIDER_LABELS[input.provider],
        base_url: input.baseUrl.trim().replace(/\/+$/, ''),
        encrypted_key: encryptSecret(apiKey),
        key_hint: maskKey(apiKey),
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Could not save the key.');
    revalidatePath('/settings/providers');
    return { ok: true, data: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProviderKey(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.schema('chat').from('provider_keys').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/settings/providers');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Refresh the model catalog for a key from the provider API. */
export async function refreshKeyModels(id: string): Promise<ActionResult<CatalogModel[]>> {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();

    const { data: key, error } = await admin
      .schema('chat')
      .from('provider_keys')
      .select('id, provider, base_url, encrypted_key')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (error || !key) throw new Error('Key not found.');

    const models = await fetchRemoteModels(
      key.provider as ProviderKind,
      decryptSecret(key.encrypted_key),
      key.base_url || undefined,
    );

    const { error: updateError } = await admin
      .schema('chat')
      .from('provider_keys')
      .update({ models, models_fetched_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath('/settings/providers');
    return { ok: true, data: models };
  } catch (error) {
    return failure(error);
  }
}
