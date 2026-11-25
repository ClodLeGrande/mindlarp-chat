'use client';

import { ArrowUp, Paperclip, Square, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

const MAX_FILES = 6;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function Composer({
  streaming,
  sendOnEnter,
  toolbar,
  onSend,
  onStop,
  autoFocus,
}: {
  streaming: boolean;
  sendOnEnter: boolean;
  toolbar: React.ReactNode;
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resize() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  function submit() {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || streaming) return;
    onSend(trimmed, files);
    setText('');
    setFiles([]);
    setFileError('');
    requestAnimationFrame(() => {
      resize();
      textareaRef.current?.focus();
    });
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        setFileError(`Up to ${MAX_FILES} files per message.`);
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="rounded-xl border border-line bg-raised shadow-sm transition-colors focus-within:border-accent/50">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs"
            >
              {file.name}
              <span className="text-muted">{formatBytes(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="cursor-pointer text-muted hover:text-ink"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {fileError && <p className="px-3 pt-2 text-xs text-danger">{fileError}</p>}

      <textarea
        ref={textareaRef}
        value={text}
        autoFocus={autoFocus}
        rows={1}
        placeholder="Message your models…"
        aria-label="Message"
        onChange={(event) => {
          setText(event.target.value);
          resize();
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            sendOnEnter &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            submit();
          }
        }}
        className="max-h-50 w-full resize-none bg-transparent px-4 py-3 text-[0.9375rem] leading-relaxed placeholder:text-muted/70 focus:outline-none"
      />

      <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.log,.yaml,.yml,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.go,.rs,.sql"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Attach files"
          title="Attach files"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={15} />
        </Button>
        {toolbar}
        <div className="ml-auto">
          {streaming ? (
            <Button size="icon" variant="outline" aria-label="Stop generating" onClick={onStop}>
              <Square size={13} />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="primary"
              aria-label="Send message"
              disabled={!text.trim() && files.length === 0}
              onClick={submit}
            >
              <ArrowUp size={15} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
