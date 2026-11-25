'use client';

import { Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { Spinner } from '@/components/ui/misc';
import { deleteAllChatData, exportAccountData } from '@/lib/actions/settings';

export function DataControls() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    setExporting(true);
    setError('');
    const result = await exportAccountData();
    setExporting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const blob = new Blob([result.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mindlarp-chat-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');
    const result = await deleteAllChatData();
    setDeleting(false);
    if (result.ok) {
      setDeleteOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <section className="rounded-lg border border-line bg-raised p-5">
        <h2 className="text-sm font-semibold">Export everything</h2>
        <p className="mt-1 mb-4 text-[0.8125rem] text-muted">
          Downloads settings, projects, conversations, messages, skills, artifact metadata and usage
          history as JSON. Provider keys are never exported.
        </p>
        <Button onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? <Spinner /> : <Download size={14} />} Export JSON
        </Button>
      </section>

      <section className="rounded-lg border border-danger/30 bg-raised p-5">
        <h2 className="text-sm font-semibold text-danger">Delete all chat data</h2>
        <p className="mt-1 mb-4 text-[0.8125rem] text-muted">
          Removes every conversation, project, skill, artifact, attachment and provider key. Your
          MindLarp account itself stays intact.
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={14} /> Delete everything
        </Button>
      </section>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete all chat data?">
        <p className="text-sm text-muted">
          This cannot be undone. Type <span className="font-mono font-semibold">DELETE</span> to
          confirm.
        </p>
        <Input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          className="mt-3"
          aria-label="Confirmation"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={confirmText !== 'DELETE' || deleting}
            onClick={() => void handleDelete()}
          >
            {deleting && <Spinner />} Delete everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
