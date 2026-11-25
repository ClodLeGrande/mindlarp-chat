'use client';

import { FileIcon, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { deleteProjectFile, uploadProjectFile } from '@/lib/actions/projects';
import type { ProjectFile } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

export function ProjectFiles({ projectId, files }: { projectId: string; files: ProjectFile[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError('');
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadProjectFile(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        break;
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteProjectFile(id);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Text files are extracted and readable by the model in every chat of this project.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => void handleUpload(event.target.files)}
        />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <Upload size={13} />} Upload
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {files.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
          No knowledge files yet.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileIcon size={15} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(file.size_bytes)}
                  {file.extracted_text ? ' · text extracted' : ' · binary (no extraction)'}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${file.name}`}
                onClick={() => void handleDelete(file.id)}
                className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
