'use server';

import { revalidatePath } from 'next/cache';

import { failure, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import type { ChatSettings } from '@/lib/types';

type SettingsPatch = Partial<
  Pick<
    ChatSettings,
    | 'display_name'
    | 'response_language'
    | 'theme'
    | 'default_provider_key_id'
    | 'default_model'
    | 'temperature'
    | 'max_tokens'
    | 'top_p'
    | 'system_prompt'
    | 'agent_mode'
    | 'enabled_skills'
    | 'send_on_enter'
  >
>;

export async function updateSettings(patch: SettingsPatch): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .schema('chat')
      .from('settings')
      .upsert({ user_id: user.id, ...patch });
    if (error) throw new Error(error.message);
    revalidatePath('/settings');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Full account export: settings, projects, conversations, messages, skills. */
export async function exportAccountData(): Promise<ActionResult<string>> {
  try {
    const { supabase, user } = await requireUser();

    const [settings, projects, conversations, messages, skills, artifacts, usage] =
      await Promise.all([
        supabase.schema('chat').from('settings').select('*').eq('user_id', user.id),
        supabase.schema('chat').from('projects').select('*').eq('user_id', user.id),
        supabase.schema('chat').from('conversations').select('*').eq('user_id', user.id),
        supabase.schema('chat').from('messages').select('*').eq('user_id', user.id),
        supabase.schema('chat').from('skills').select('*').eq('user_id', user.id),
        supabase
          .schema('chat')
          .from('artifacts')
          .select('id, kind, title, mime_type, size_bytes, meta, created_at')
          .eq('user_id', user.id),
        supabase.schema('chat').from('usage_events').select('*').eq('user_id', user.id),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email },
      settings: settings.data ?? [],
      projects: projects.data ?? [],
      conversations: conversations.data ?? [],
      messages: messages.data ?? [],
      skills: skills.data ?? [],
      artifacts: artifacts.data ?? [],
      usageEvents: usage.data ?? [],
    };

    return { ok: true, data: JSON.stringify(payload, null, 2) };
  } catch (error) {
    return failure(error);
  }
}

/** Delete all chat data for the signed-in user (account itself is kept). */
export async function deleteAllChatData(): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    for (const bucket of ['chat-attachments', 'chat-artifacts', 'chat-project-files']) {
      const { data: objects } = await supabase.storage.from(bucket).list(user.id, {
        limit: 1000,
      });
      // Objects may live in nested folders (conversation / project ids).
      const paths: string[] = [];
      for (const entry of objects ?? []) {
        if (entry.id === null) {
          const { data: nested } = await supabase.storage
            .from(bucket)
            .list(`${user.id}/${entry.name}`, { limit: 1000 });
          for (const child of nested ?? []) {
            paths.push(`${user.id}/${entry.name}/${child.name}`);
          }
        } else {
          paths.push(`${user.id}/${entry.name}`);
        }
      }
      if (paths.length > 0) {
        await supabase.storage.from(bucket).remove(paths);
      }
    }

    const tables = [
      'usage_events',
      'artifacts',
      'messages',
      'conversations',
      'project_files',
      'projects',
      'skills',
      'provider_keys',
    ];
    for (const table of tables) {
      const { error } = await supabase.schema('chat').from(table).delete().eq('user_id', user.id);
      if (error) throw new Error(error.message);
    }

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
