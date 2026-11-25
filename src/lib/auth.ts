import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { ChatSettings } from '@/lib/types';

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, user };
}

export const DEFAULT_SETTINGS: Omit<ChatSettings, 'user_id' | 'created_at' | 'updated_at'> = {
  display_name: '',
  response_language: 'en',
  theme: 'system',
  default_provider_key_id: null,
  default_model: '',
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1,
  system_prompt: '',
  agent_mode: false,
  enabled_skills: [],
  send_on_enter: true,
};

export async function loadSettings(userId: string): Promise<ChatSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .schema('chat')
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data as ChatSettings;
  return {
    ...DEFAULT_SETTINGS,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
