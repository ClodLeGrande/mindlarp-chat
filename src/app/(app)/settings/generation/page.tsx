import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { GenerationForm } from '@/components/settings/generation-form';
import { loadSettings } from '@/lib/auth';
import { loadProviderCatalog } from '@/lib/page-data';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Generation settings' };

export default async function GenerationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [settings, catalog] = await Promise.all([
    loadSettings(user.id),
    loadProviderCatalog(user.id),
  ]);

  return (
    <GenerationForm
      settings={settings}
      keyRefs={catalog.keyRefs}
      modelsByKey={catalog.modelsByKey}
    />
  );
}
