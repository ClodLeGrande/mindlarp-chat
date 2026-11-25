'use client';

import { Download, ExternalLink, FileText, FileType, Globe, Presentation } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ArtifactToolOutput } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

const KIND_META = {
  presentation: { icon: Presentation, label: 'PPTX presentation' },
  pdf: { icon: FileText, label: 'PDF document' },
  document: { icon: FileType, label: 'DOCX document' },
  html: { icon: Globe, label: 'HTML page' },
} as const;

export function ArtifactCard({ artifact }: { artifact: ArtifactToolOutput }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const meta = KIND_META[artifact.kind] ?? KIND_META.html;
  const Icon = meta.icon;

  return (
    <>
      <div className="rise-in my-2 flex items-center gap-3 rounded-lg border border-line bg-raised p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{artifact.title}</p>
          <p className="text-xs text-muted">
            {meta.label} · {formatBytes(artifact.sizeBytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {artifact.previewUrl && (
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
          )}
          <a
            href={artifact.url}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-ink px-3 text-[0.8125rem] font-medium text-paper transition-opacity hover:opacity-85"
          >
            <Download size={13} /> Download
          </a>
        </div>
      </div>

      {artifact.previewUrl && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={artifact.title}
          wide
        >
          <iframe
            src={artifact.previewUrl}
            title={artifact.title}
            sandbox="allow-scripts"
            className="h-[60vh] w-full rounded-md border border-line bg-white"
          />
          <div className="mt-3 flex justify-end">
            <a
              href={artifact.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Open in new tab <ExternalLink size={12} />
            </a>
          </div>
        </Dialog>
      )}
    </>
  );
}
