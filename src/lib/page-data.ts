import 'server-only';

import { listKeyRefs } from '@/lib/ai/keys';
import { SUGGESTED_MODELS } from '@/lib/models';
import { createClient } from '@/lib/supabase/server';
import type { CatalogModel, ProviderKeyRef } from '@/lib/types';

export interface ProviderCatalog {
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
}

/** Keys + cached model catalogs for pickers in pages and forms. */
export async function loadProviderCatalog(userId: string): Promise<ProviderCatalog> {
  const keyRefs = await listKeyRefs(userId);
  const supabase = await createClient();
  const { data: keys } = await supabase.schema('chat').from('provider_keys').select('id, models');

  const modelsByKey: Record<string, CatalogModel[]> = {};
  for (const key of keyRefs) {
    if (key.source === 'env') {
      modelsByKey[key.id] = SUGGESTED_MODELS[key.provider];
    } else {
      const row = (keys ?? []).find((entry) => entry.id === key.id);
      modelsByKey[key.id] = (row?.models as CatalogModel[]) ?? [];
    }
  }
  return { keyRefs, modelsByKey };
}
