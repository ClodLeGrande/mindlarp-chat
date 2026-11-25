'use client';

import { Check, Copy, FileIcon, RefreshCw } from 'lucide-react';
import { isToolUIPart } from 'ai';
import { useState } from 'react';

import { Markdown } from '@/components/chat/markdown';
import { ToolPart } from '@/components/chat/tool-part';
import { Badge } from '@/components/ui/misc';
import type { ChatUIMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

export function MessageItem({
  message,
  isLast,
  streaming,
  onRegenerate,
}: {
  message: ChatUIMessage;
  isLast: boolean;
  streaming: boolean;
  onRegenerate: (messageId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const text = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const showCaret = streaming && isLast && !isUser;

  return (
    <article className="group rise-in">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="label">{isUser ? 'You' : (message.metadata?.model ?? 'Assistant')}</span>
        {message.metadata?.status === 'stopped' && <Badge>stopped</Badge>}
        {message.metadata?.status === 'error' && <Badge tone="danger">error</Badge>}
      </div>

      <div
        className={cn(
          isUser && 'rounded-lg border border-line bg-raised px-4 py-3',
          !isUser && 'min-w-0',
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            if (!part.text) return null;
            return isUser ? (
              <p key={index} className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
                {part.text}
              </p>
            ) : (
              <div
                key={index}
                className={cn(showCaret && index === lastTextIndex(message) && 'stream-caret')}
              >
                <Markdown text={part.text} />
              </div>
            );
          }

          if (part.type === 'reasoning') {
            if (!part.text) return null;
            return (
              <details
                key={index}
                className="my-2 rounded-md border border-line bg-surface px-3 py-2"
              >
                <summary className="cursor-pointer text-xs text-muted select-none">
                  Reasoning
                </summary>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-muted">
                  {part.text}
                </p>
              </details>
            );
          }

          if (part.type === 'file') {
            return part.mediaType.startsWith('image/') ? (
              // Signed, short-lived storage URLs — next/image optimization does not apply.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={part.url}
                alt={part.filename ?? 'Attached image'}
                className="my-2 max-h-64 rounded-md border border-line"
              />
            ) : (
              <span
                key={index}
                className="my-1 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-muted"
              >
                <FileIcon size={12} /> {part.filename ?? 'attachment'}
              </span>
            );
          }

          if (isToolUIPart(part)) {
            const toolName = 'toolName' in part ? part.toolName : part.type.replace(/^tool-/, '');
            return (
              <ToolPart
                key={part.toolCallId ?? index}
                toolName={toolName}
                state={part.state}
                output={'output' in part ? part.output : undefined}
                errorText={'errorText' in part ? part.errorText : undefined}
              />
            );
          }

          return null;
        })}
      </div>

      {!isUser && text && (
        <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => void copyText()}
            className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {isLast && !streaming && (
            <button
              type="button"
              onClick={() => onRegenerate(message.id)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <RefreshCw size={12} /> Regenerate
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function lastTextIndex(message: ChatUIMessage) {
  for (let i = message.parts.length - 1; i >= 0; i -= 1) {
    if (message.parts[i].type === 'text') return i;
  }
  return -1;
}
