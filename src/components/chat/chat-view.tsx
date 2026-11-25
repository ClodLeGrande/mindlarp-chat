'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Composer } from '@/components/chat/composer';
import { MessageItem } from '@/components/chat/message-item';
import { ModelPicker } from '@/components/chat/model-picker';
import { SkillsPicker } from '@/components/chat/skills-picker';
import { TOOL_LABELS } from '@/components/chat/tool-part';
import { ProjectIcon } from '@/components/project-icon';
import { Switch } from '@/components/ui/switch';
import { AgentSteps, Spinner } from '@/components/ui/misc';
import { updateConversationSettings } from '@/lib/actions/conversations';
import { colorClasses } from '@/lib/project-options';
import type {
  CatalogModel,
  ChatUIMessage,
  Conversation,
  Project,
  ProviderKeyRef,
  ProviderKind,
  Skill,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Write a one-page project brief as a PDF',
  'Build a 6-slide pitch deck for a product idea',
  'Draft a launch plan for next month',
  'Make a self-contained HTML status dashboard',
];

export function ChatView({
  conversation,
  initialMessages,
  keyRefs,
  modelsByKey,
  customSkills,
  project,
  sendOnEnter,
}: {
  conversation: Conversation;
  initialMessages: ChatUIMessage[];
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
  customSkills: Pick<Skill, 'id' | 'name' | 'description'>[];
  project: Pick<Project, 'id' | 'name' | 'icon' | 'color'> | null;
  sendOnEnter: boolean;
}) {
  const router = useRouter();
  const [providerKeyId, setProviderKeyId] = useState(conversation.provider_key_id);
  const [model, setModel] = useState(conversation.model);
  const [agentMode, setAgentMode] = useState(conversation.agent_mode);
  const [enabledSkills, setEnabledSkills] = useState(conversation.enabled_skills);
  const [actionError, setActionError] = useState('');

  const { messages, sendMessage, regenerate, stop, status, error, clearError } = useChat({
    id: conversation.id,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: () => router.refresh(),
  });

  const streaming = status === 'streaming' || status === 'submitted';
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const agentWorking = streaming && agentMode;
  const activeToolLabel = useMemo(() => {
    if (!agentWorking) return '';
    const last = messages[messages.length - 1];
    const running = last?.parts.find(
      (part) =>
        isToolUIPart(part) &&
        (part.state === 'input-streaming' || part.state === 'input-available'),
    );
    if (!running || !isToolUIPart(running)) return '';
    const name = 'toolName' in running ? running.toolName : running.type.replace(/^tool-/, '');
    return TOOL_LABELS[name] ?? name;
  }, [agentWorking, messages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element && stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, status]);

  const errorMessage = useMemo(() => {
    if (!error) return '';
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      return parsed.error ?? error.message;
    } catch {
      return error.message;
    }
  }, [error]);

  async function patchConversation(
    patch: Partial<
      Pick<Conversation, 'model' | 'provider' | 'provider_key_id' | 'agent_mode' | 'enabled_skills'>
    >,
  ) {
    const result = await updateConversationSettings(conversation.id, patch);
    if (!result.ok) setActionError(result.error);
  }

  function handleSelectModel(keyId: string, provider: ProviderKind, nextModel: string) {
    setProviderKeyId(keyId);
    setModel(nextModel);
    void patchConversation({ provider_key_id: keyId, provider, model: nextModel });
  }

  function handleToggleSkill(key: string) {
    const next = enabledSkills.includes(key)
      ? enabledSkills.filter((entry) => entry !== key)
      : [...enabledSkills, key];
    setEnabledSkills(next);
    void patchConversation({ enabled_skills: next });
  }

  function handleToggleAgent(next: boolean) {
    setAgentMode(next);
    void patchConversation({ agent_mode: next });
  }

  function handleSend(text: string, files: File[]) {
    setActionError('');
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    void sendMessage({ text, files: transfer.files });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5 md:px-6">
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.title}</h1>
        {project && (
          <a
            href={`/projects/${project.id}`}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
              colorClasses(project.color).soft,
              colorClasses(project.color).text,
            )}
          >
            <ProjectIcon icon={project.icon} size={12} />
            <span className="hidden sm:inline">{project.name}</span>
          </a>
        )}
      </header>

      {(errorMessage || actionError) && (
        <div className="flex items-start gap-2 border-b border-line bg-accent-soft/40 px-4 py-2.5 text-[0.8125rem] md:px-6">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-danger" />
          <p className="flex-1">{errorMessage || actionError}</p>
          <button
            type="button"
            aria-label="Dismiss error"
            className="cursor-pointer text-muted hover:text-ink"
            onClick={() => {
              clearError();
              setActionError('');
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thread */}
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-14 text-center">
              <div>
                <p className="label mb-3">MindLarp Chat</p>
                <h2 className="font-display text-4xl leading-tight md:text-5xl">
                  What are we <em className="text-accent">making</em> today?
                </h2>
              </div>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSend(suggestion, [])}
                    className="cursor-pointer rounded-full border border-line bg-raised px-3.5 py-1.5 text-[0.8125rem] text-muted transition-colors hover:border-accent/40 hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message as ChatUIMessage}
                isLast={index === messages.length - 1}
                streaming={streaming}
                onRegenerate={(messageId) => void regenerate({ messageId })}
              />
            ))
          )}
          {status === 'submitted' && (
            <div className="flex items-center gap-2 text-sm text-muted">
              {agentMode ? (
                <>
                  <AgentSteps /> Agent is planning…
                </>
              ) : (
                <>
                  <Spinner /> Thinking…
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-paper px-4 py-3 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {agentWorking && (
            <div className="rise-in mb-2 flex items-center gap-2.5 rounded-md border border-accent/30 bg-accent-soft/60 px-3 py-1.5 text-xs font-medium text-accent">
              <AgentSteps />
              <span>{activeToolLabel ? `${activeToolLabel}…` : 'Agent is working…'}</span>
              <span
                className="agent-track ml-auto h-0.5 w-16 rounded-full bg-accent/20"
                aria-hidden
              />
            </div>
          )}
          <Composer
            streaming={streaming}
            sendOnEnter={sendOnEnter}
            onSend={handleSend}
            onStop={() => void stop()}
            autoFocus
            toolbar={
              <>
                <ModelPicker
                  keyRefs={keyRefs}
                  modelsByKey={modelsByKey}
                  currentKeyId={providerKeyId}
                  currentModel={model}
                  onSelect={handleSelectModel}
                />
                <SkillsPicker
                  enabled={enabledSkills}
                  customSkills={customSkills}
                  onToggle={handleToggleSkill}
                />
                <label
                  className={cn(
                    'flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                    agentMode
                      ? 'border-accent/40 bg-accent-soft text-accent'
                      : 'border-line bg-raised text-ink',
                  )}
                >
                  <Switch checked={agentMode} onChange={handleToggleAgent} label="Agent mode" />
                  Agent
                  {agentMode && (
                    <span className="agent-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  )}
                </label>
              </>
            }
          />
          <p className="mt-2 text-center text-[0.6875rem] text-muted">
            {agentMode
              ? 'Agent mode: the model can use tools and create files.'
              : 'Enter to send · Shift+Enter for a new line'}
          </p>
        </div>
      </div>
    </div>
  );
}
