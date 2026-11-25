'use server';

import { revalidatePath } from 'next/cache';

import { failure, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';

export interface SkillInput {
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
}

export async function createSkill(input: SkillInput): Promise<ActionResult<string>> {
  try {
    const { supabase, user } = await requireUser();
    const name = input.name.trim();
    if (!name) throw new Error('Skill name is required.');

    const { data, error } = await supabase
      .schema('chat')
      .from('skills')
      .insert({ ...input, name, user_id: user.id })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Could not create the skill.');
    revalidatePath('/skills');
    return { ok: true, data: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function updateSkill(id: string, input: SkillInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.schema('chat').from('skills').update(input).eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/skills');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.schema('chat').from('skills').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/skills');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
