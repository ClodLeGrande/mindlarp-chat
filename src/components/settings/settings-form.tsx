'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { updateSettings } from '@/lib/actions/settings';
import type { ChatSettings } from '@/lib/types';

type Patch = Partial<ChatSettings>;

/** Shared save button + status for settings sections. */
export function useSettingsSave() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(patch: Patch) {
    setPending(true);
    setError('');
    setSaved(false);
    const result = await updateSettings(patch);
    setPending(false);
    if (result.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error);
    }
  }

  return { save, pending, saved, error };
}

export function SaveBar({
  pending,
  saved,
  error,
  onSave,
}: {
  pending: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-line pt-4">
      <Button variant="primary" onClick={onSave} disabled={pending}>
        {pending && <Spinner className="border-paper/40 border-t-paper" />}
        Save changes
      </Button>
      {saved && (
        <span className="flex items-center gap-1 text-xs text-accent">
          <Check size={13} /> Saved
        </span>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
