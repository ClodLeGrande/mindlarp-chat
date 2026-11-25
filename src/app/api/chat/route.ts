import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from 'ai';

import { resolveKey, touchKeyUsage } from '@/lib/ai/keys';
import { resolveLanguageModel } from '@/lib/ai/providers';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildTools } from '@/lib/ai/tools';
import { loadSettings } from '@/lib/auth';
import {
  deleteMessagesFrom,
  loadConversation,
  loadMessages,
  persistAssistantMessage,
  persistUserMessage,
  recordUsage,
  touchConversation,
} from '@/lib/chat-store';
import { SUGGESTED_MODELS } from '@/lib/models';
import { builtinSkill, BUILTIN_SKILLS } from '@/lib/skills';
import { createClient } from '@/lib/supabase/server';
import type { ChatUIMessage, Project, ProjectFile, Skill } from '@/lib/types';
import { titleFromText } from '@/lib/utils';

export const maxDuration = 300;

interface ChatRequestBody {
  id: string;
  messages: ChatUIMessage[];
  trigger?: 'submit-message' | 'regenerate-message';
  messageId?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as ChatRequestBody;
  const conversation = await loadConversation(body.id);
  if (!conversation) {
    return Response.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  const settings = await loadSettings(user.id);
  const key = await resolveKey(conversation, settings.default_provider_key_id);
  if (!key) {
    return Response.json(
      {
        error: 'No API key configured. Add one in Settings → Providers, or pick a server default.',
      },
      { status: 400 },
    );
  }

  const modelId =
    conversation.model || settings.default_model || SUGGESTED_MODELS[key.provider][0]?.id || '';
  if (!modelId) {
    return Response.json({ error: 'No model selected for this chat.' }, { status: 400 });
  }

  let project: Project | null = null;
  let projectFiles: ProjectFile[] = [];
  if (conversation.project_id) {
    const { data } = await supabase
      .schema('chat')
      .from('projects')
      .select('*')
      .eq('id', conversation.project_id)
      .maybeSingle();
    project = (data as Project) ?? null;
    if (project) {
      const { data: files } = await supabase
        .schema('chat')
        .from('project_files')
        .select('*')
        .eq('project_id', project.id);
      projectFiles = (files ?? []) as ProjectFile[];
    }
  }

  const builtinKeys = conversation.enabled_skills.filter((entry) => builtinSkill(entry));
  const customSkillIds = conversation.enabled_skills.filter((entry) => !builtinSkill(entry));
  let customSkills: Skill[] = [];
  if (customSkillIds.length > 0) {
    const { data } = await supabase
      .schema('chat')
      .from('skills')
      .select('*')
      .in('id', customSkillIds);
    customSkills = (data ?? []) as Skill[];
  }

  const origin = new URL(request.url).origin;
  const toolContext = {
    userId: user.id,
    conversationId: conversation.id,
    origin,
    projectFiles: projectFiles.map((file) => ({
      id: file.id,
      name: file.name,
      mime_type: file.mime_type,
      storage_path: file.storage_path,
      extracted_text: file.extracted_text,
    })),
  };
  const tools = buildTools(toolContext, {
    agentMode: conversation.agent_mode,
    enabledSkillKeys: builtinKeys,
  });
  // Validate persisted history against the full tool set so older tool parts
  // stay readable even when a skill is currently disabled.
  const validationTools = buildTools(toolContext, {
    agentMode: true,
    enabledSkillKeys: BUILTIN_SKILLS.map((skill) => skill.key),
  });

  let uiMessages: ChatUIMessage[];
  if (body.trigger === 'regenerate-message' && body.messageId) {
    await deleteMessagesFrom(conversation.id, body.messageId);
    uiMessages = await loadMessages(conversation.id);
  } else {
    const incoming = body.messages?.[body.messages.length - 1];
    if (!incoming || incoming.role !== 'user') {
      return Response.json({ error: 'Expected a user message.' }, { status: 400 });
    }
    const previous = await loadMessages(conversation.id);
    const stored = await persistUserMessage(conversation.id, user.id, incoming);
    uiMessages = [...previous, stored];

    const text = stored.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
    const title = conversation.title === 'New chat' ? titleFromText(text) : undefined;
    await touchConversation(conversation.id, title);
  }

  if (uiMessages.length === 0) {
    return Response.json({ error: 'Nothing to respond to.' }, { status: 400 });
  }

  const validated = await validateUIMessages({
    messages: uiMessages,
    tools: validationTools,
  }).catch(() => uiMessages);

  const system = buildSystemPrompt({
    settings,
    project,
    projectFiles,
    enabledSkillKeys: builtinKeys,
    customSkills,
    agentMode: conversation.agent_mode,
  });

  const startedAt = Date.now();
  let streamError: string | null = null;

  const result = streamText({
    model: resolveLanguageModel({
      provider: key.provider,
      model: modelId,
      apiKey: key.apiKey,
      baseUrl: key.baseUrl,
    }),
    system,
    messages: await convertToModelMessages(validated),
    tools,
    stopWhen: stepCountIs(conversation.agent_mode ? 12 : 6),
    temperature: settings.temperature,
    maxOutputTokens: settings.max_tokens,
    topP: settings.top_p,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: uiMessages,
      sendReasoning: true,
      onError: (error) => {
        streamError = error instanceof Error ? error.message : 'The model request failed.';
        return streamError;
      },
      onEnd: async ({ messages, isAborted }) => {
        const responseMessage = messages[messages.length - 1];
        if (!responseMessage || responseMessage.role !== 'assistant') return;

        const usage = await Promise.resolve(result.totalUsage).catch(() => undefined);
        const promptTokens = usage?.inputTokens ?? 0;
        const completionTokens = usage?.outputTokens ?? 0;
        const status = streamError ? 'error' : isAborted ? 'stopped' : 'complete';

        await persistAssistantMessage(conversation.id, user.id, responseMessage, {
          provider: key.provider,
          model: modelId,
          status,
          error: streamError ?? undefined,
          promptTokens,
          completionTokens,
        });
        await recordUsage({
          userId: user.id,
          conversationId: conversation.id,
          provider: key.provider,
          model: modelId,
          promptTokens,
          completionTokens,
          latencyMs: Date.now() - startedAt,
          agentMode: conversation.agent_mode,
          skills: conversation.enabled_skills,
          status,
        });
        await touchKeyUsage(key.keyId);
        await touchConversation(conversation.id);
      },
    }),
  });
}
