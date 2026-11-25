import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { GeneralForm } from '@/components/settings/general-form';
import { loadSettings } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings' };

export default async function GeneralSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const settings = await loadSettings(user.id);
  return <GeneralForm settings={settings} />;
}
