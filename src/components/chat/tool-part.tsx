'use client';

import { ChevronRight, Wrench } from 'lucide-react';
import { useState } from 'react';

import { ArtifactCard } from '@/components/chat/artifact-card';
import { AgentSteps } from '@/components/ui/misc';
import type { ArtifactToolOutput } from '@/lib/types';
import { cn } from '@/lib/utils';

export const TOOL_LABELS: Record<string, string> = {
  createPresentation: 'Building presentation',
  createPdf: 'Writing PDF',
  createDocument: 'Writing DOCX',
  createHtmlArtifact: 'Building HTML page',
  listProjectFiles: 'Listing project files',
  readProjectFile: 'Reading project file',
};

interface ToolPartProps {
  toolName: string;
  state: string;
  output?: unknown;
  errorText?: string;
}

export function ToolPart({ toolName, state, output, errorText }: ToolPartProps) {
  const [expanded, setExpanded] = useState(false);
  const running = state === 'input-streaming' || state === 'input-available';
  const label = TOOL_LABELS[toolName] ?? toolName;

  const artifact =
    output && typeof output === 'object' && 'artifactId' in output
      ? (output as ArtifactToolOutput)
      : null;

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-[0.8125rem] transition-colors hover:bg-raised',
          state === 'output-error' && 'border-danger/40',
        )}
      >
        {running ? <AgentSteps /> : <Wrench size={13} className="text-muted" />}
        <span className={cn('flex-1', running ? 'text-accent' : 'text-ink')}>
          {running ? `${label}…` : label}
        </span>
        {state === 'output-error' && <span className="text-xs text-danger">failed</span>}
        <ChevronRight
          size={13}
          className={cn('text-muted transition-transform', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-line bg-surface p-2.5 font-mono text-[0.7rem] leading-relaxed text-muted">
          {JSON.stringify(output ?? errorText ?? { state }, null, 2)}
        </pre>
      )}

      {state === 'output-error' && errorText && (
        <p className="mt-1 text-xs text-danger">{errorText}</p>
      )}

      {artifact && <ArtifactCard artifact={artifact} />}
    </div>
  );
}
