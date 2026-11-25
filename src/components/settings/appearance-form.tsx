'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useMounted, useTheme } from '@/components/theme-provider';
import { updateSettings } from '@/lib/actions/settings';
import type { Theme } from '@/lib/types';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function AppearanceForm({ initialTheme }: { initialTheme: Theme }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? theme : initialTheme;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-sm text-muted">
        The interface is monochrome by design — one accent, hairline borders, no gradients.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setTheme(option.value);
              void updateSettings({ theme: option.value });
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-5 transition-colors',
              current === option.value
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-raised hover:border-accent/40',
            )}
          >
            <option.icon
              size={18}
              className={current === option.value ? 'text-accent' : 'text-muted'}
            />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
