'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-lg border border-line bg-raised p-0 text-ink shadow-2xl backdrop:bg-black/40 open:animate-[rise-in_0.2s_ease-out]',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-display text-xl">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
