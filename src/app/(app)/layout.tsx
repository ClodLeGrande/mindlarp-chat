import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { createClient } from '@/lib/supabase/server';
import type { Conversation, Project } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [conversationsResult, projectsResult] = await Promise.all([
    supabase
      .schema('chat')
      .from('conversations')
      .select('id, title, project_id, pinned, archived, last_message_at')
      .eq('archived', false)
      .order('pinned', { ascending: false })
      .order('last_message_at', { ascending: false })
      .limit(300),
    supabase
      .schema('chat')
      .from('projects')
      .select('id, name, icon, color, archived')
      .eq('archived', false)
      .order('updated_at', { ascending: false }),
  ]);

  return (
    <AppShell
      userEmail={user.email ?? ''}
      userName={(user.user_metadata?.full_name as string) ?? ''}
      conversations={(conversationsResult.data ?? []) as Conversation[]}
      projects={(projectsResult.data ?? []) as Project[]}
    >
      {children}
    </AppShell>
  );
}
