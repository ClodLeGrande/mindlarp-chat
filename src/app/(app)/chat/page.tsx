import { redirect } from 'next/navigation';

import { createConversation } from '@/lib/actions/conversations';
import { createClient } from '@/lib/supabase/server';

/**
 * "New chat" entry: reuse the most recent empty conversation when one exists,
 * otherwise create a fresh row and redirect to it.
 */
export default async function NewChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: recent } = await supabase
    .schema('chat')
    .from('conversations')
    .select('id, messages(count)')
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(10);

  const empty = (recent ?? []).find((row) => {
    const counts = row.messages as unknown as { count: number }[];
    return (counts?.[0]?.count ?? 0) === 0;
  });
  if (empty) redirect(`/chat/${empty.id}`);

  const result = await createConversation();
  if (result.ok && result.data) redirect(`/chat/${result.data}`);
  redirect('/chat');
}
