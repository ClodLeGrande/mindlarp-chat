'use server';

import { revalidatePath } from 'next/cache';

import { failure, type ActionResult } from '@/lib/action-result';
import { loadSettings, requireUser } from '@/lib/auth';
import type { Conversation } from '@/lib/types';

export async function createConversation(projectId?: string): Promise<ActionResult<string>> {
  try {
    const { supabase, user } = await requireUser();
    const settings = await loadSettings(user.id);

    let defaults = {
      provider: '',
      model: settings.default_model,
      provider_key_id: settings.default_provider_key_id,
      agent_mode: settings.agent_mode,
      enabled_skills: settings.enabled_skills,
    };

    if (projectId) {
      const { data: project } = await supabase
        .schema('chat')
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (project) {
        defaults = {
          provider: defaults.provider,
          model: project.default_model || defaults.model,
          provider_key_id: project.default_provider_key_id ?? defaults.provider_key_id,
          agent_mode: project.agent_mode,
          enabled_skills: project.enabled_skills,
        };
      }
    }

    const { data, error } = await supabase
      .schema('chat')
      .from('conversations')
      .insert({ user_id: user.id, project_id: projectId ?? null, ...defaults })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Could not create the chat.');
    revalidatePath('/chat');
    return { ok: true, data: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function renameConversation(id: string, title: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const clean = title.trim().slice(0, 120);
    if (!clean) throw new Error('Title cannot be empty.');
    const { error } = await supabase
      .schema('chat')
      .from('conversations')
      .update({ title: clean })
      .eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/chat');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateConversationSettings(
  id: string,
  patch: Partial<
    Pick<Conversation, 'model' | 'provider' | 'provider_key_id' | 'agent_mode' | 'enabled_skills'>
  >,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .schema('chat')
      .from('conversations')
      .update(patch)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleConversationPin(id: string, pinned: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .schema('chat')
      .from('conversations')
      .update({ pinned })
      .eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/chat');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.schema('chat').from('conversations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/chat');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
