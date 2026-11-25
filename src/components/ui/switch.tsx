'use client';

import { cn } from '@/lib/utils';

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 disabled:opacity-40',
        checked ? 'border-accent bg-accent' : 'border-line bg-surface',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-paper transition-[left] duration-150',
          checked ? 'left-[calc(100%-1.1rem)]' : 'left-[3px]',
        )}
      />
    </button>
  );
}
