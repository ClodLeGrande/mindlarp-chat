import 'server-only';

import { randomUUID } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ChatUIMessage, Conversation, MessageRow, MessageStatus } from '@/lib/types';

const SIGNED_URL_TTL = 3600;
const ATTACHMENT_BUCKET = 'chat-attachments';

export async function loadConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .schema('chat')
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Conversation) ?? null;
}

export async function loadMessages(conversationId: string): Promise<ChatUIMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema('chat')
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as MessageRow[];
  return Promise.all(rows.map(rowToUIMessage));
}

async function rowToUIMessage(row: MessageRow): Promise<ChatUIMessage> {
  const parts = await Promise.all(
    row.parts.map(async (part) => {
      if (part.type !== 'file') return part;
      const storagePath = part.providerMetadata?.mindlarp?.storagePath;
      if (typeof storagePath !== 'string') return part;
      const admin = createAdminClient();
      const { data } = await admin.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL);
      return data ? { ...part, url: data.signedUrl } : part;
    }),
  );

  return {
    id: row.id,
    role: row.role,
    parts,
    metadata: {
      createdAt: row.created_at,
      provider: row.provider || undefined,
      model: row.model || undefined,
      status: row.status,
      usage:
        row.prompt_tokens || row.completion_tokens
          ? {
              promptTokens: row.prompt_tokens,
              completionTokens: row.completion_tokens,
              totalTokens: row.prompt_tokens + row.completion_tokens,
            }
          : undefined,
    },
  };
}

/**
 * Persist a user message. Data-URL attachments are moved to private storage
 * and replaced with signed URLs before both model conversion and persistence.
 */
export async function persistUserMessage(
  conversationId: string,
  userId: string,
  message: ChatUIMessage,
): Promise<ChatUIMessage> {
  const admin = createAdminClient();
  const parts = await Promise.all(
    message.parts.map(async (part) => {
      if (part.type !== 'file' || !part.url.startsWith('data:')) return part;

      const match = /^data:([^;]+);base64,(.+)$/s.exec(part.url);
      if (!match) return part;

      const bytes = Buffer.from(match[2], 'base64');
      const safeName = (part.filename ?? 'attachment').replace(/[^\w.\-]+/g, '_');
      const storagePath = `${userId}/${conversationId}/${randomUUID()}-${safeName}`;

      const { error } = await admin.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, bytes, { contentType: part.mediaType });
      if (error) throw new Error(`Attachment upload failed: ${error.message}`);

      const { data: signed } = await admin.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL);

      return {
        ...part,
        url: signed?.signedUrl ?? part.url,
        providerMetadata: {
          ...part.providerMetadata,
          mindlarp: { storagePath, bucket: ATTACHMENT_BUCKET },
        },
      };
    }),
  );

  const stored: ChatUIMessage = { ...message, parts };

  const { error } = await admin.schema('chat').from('messages').upsert({
    id: stored.id,
    conversation_id: conversationId,
    user_id: userId,
    role: stored.role,
    parts: stored.parts,
    status: 'complete',
  });
  if (error) throw new Error(error.message);

  return stored;
}

export async function persistAssistantMessage(
  conversationId: string,
  userId: string,
  message: ChatUIMessage,
  info: {
    provider: string;
    model: string;
    status: MessageStatus;
    error?: string;
    promptTokens?: number;
    completionTokens?: number;
  },
) {
  const admin = createAdminClient();
  const { error } = await admin
    .schema('chat')
    .from('messages')
    .upsert({
      id: message.id,
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      parts: message.parts,
      status: info.status,
      provider: info.provider,
      model: info.model,
      error: info.error ?? '',
      prompt_tokens: info.promptTokens ?? 0,
      completion_tokens: info.completionTokens ?? 0,
    });
  if (error) throw new Error(error.message);
}

/** Delete a message and everything after it (used by regenerate). */
export async function deleteMessagesFrom(conversationId: string, messageId: string) {
  const supabase = await createClient();
  const { data: target } = await supabase
    .schema('chat')
    .from('messages')
    .select('created_at')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (!target) return;

  const { error } = await supabase
    .schema('chat')
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .gte('created_at', target.created_at);
  if (error) throw new Error(error.message);
}

export async function touchConversation(conversationId: string, title?: string) {
  const supabase = await createClient();
  const patch: { last_message_at: string; title?: string } = {
    last_message_at: new Date().toISOString(),
  };
  if (title) patch.title = title;
  await supabase.schema('chat').from('conversations').update(patch).eq('id', conversationId);
}

export async function recordUsage(event: {
  userId: string;
  conversationId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  agentMode: boolean;
  skills: string[];
  status: string;
}) {
  const admin = createAdminClient();
  await admin
    .schema('chat')
    .from('usage_events')
    .insert({
      user_id: event.userId,
      conversation_id: event.conversationId,
      provider: event.provider,
      model: event.model,
      prompt_tokens: event.promptTokens,
      completion_tokens: event.completionTokens,
      total_tokens: event.promptTokens + event.completionTokens,
      latency_ms: event.latencyMs,
      agent_mode: event.agentMode,
      skills: event.skills,
      status: event.status,
    });
}
