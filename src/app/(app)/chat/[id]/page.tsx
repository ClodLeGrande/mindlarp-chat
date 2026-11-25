import { notFound } from 'next/navigation';

import { ChatView } from '@/components/chat/chat-view';
import { listKeyRefs } from '@/lib/ai/keys';
import { loadSettings } from '@/lib/auth';
import { loadConversation, loadMessages } from '@/lib/chat-store';
import { SUGGESTED_MODELS } from '@/lib/models';
import { createClient } from '@/lib/supabase/server';
import type { CatalogModel, Project, Skill } from '@/lib/types';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const conversation = await loadConversation(id);
  if (!conversation) notFound();

  const [messages, settings, keyRefs, keysResult, skillsResult, projectResult] = await Promise.all([
    loadMessages(id),
    loadSettings(user.id),
    listKeyRefs(user.id),
    supabase.schema('chat').from('provider_keys').select('id, models'),
    supabase
      .schema('chat')
      .from('skills')
      .select('id, name, description')
      .eq('enabled', true)
      .order('created_at'),
    conversation.project_id
      ? supabase
          .schema('chat')
          .from('projects')
          .select('id, name, icon, color')
          .eq('id', conversation.project_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const modelsByKey: Record<string, CatalogModel[]> = {};
  for (const key of keyRefs) {
    if (key.source === 'env') {
      modelsByKey[key.id] = SUGGESTED_MODELS[key.provider];
    } else {
      const row = (keysResult.data ?? []).find((entry) => entry.id === key.id);
      modelsByKey[key.id] = (row?.models as CatalogModel[]) ?? [];
    }
  }

  return (
    <ChatView
      key={conversation.id}
      conversation={conversation}
      initialMessages={messages}
      keyRefs={keyRefs}
      modelsByKey={modelsByKey}
      customSkills={(skillsResult.data ?? []) as Pick<Skill, 'id' | 'name' | 'description'>[]}
      project={(projectResult.data as Project | null) ?? null}
      sendOnEnter={settings.send_on_enter}
    />
  );
}
