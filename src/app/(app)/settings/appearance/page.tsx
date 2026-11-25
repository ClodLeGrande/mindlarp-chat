import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AppearanceForm } from '@/components/settings/appearance-form';
import { loadSettings } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Appearance' };

export default async function AppearancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const settings = await loadSettings(user.id);
  return <AppearanceForm initialTheme={settings.theme} />;
}
