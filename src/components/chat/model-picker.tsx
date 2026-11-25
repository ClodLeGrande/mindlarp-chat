'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Popover } from '@/components/ui/popover';
import { Input } from '@/components/ui/field';
import { modelsForKey } from '@/lib/models';
import type { CatalogModel, ProviderKeyRef, ProviderKind } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ModelPicker({
  keyRefs,
  modelsByKey,
  currentKeyId,
  currentModel,
  onSelect,
}: {
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
  currentKeyId: string | null;
  currentModel: string;
  onSelect: (keyId: string, provider: ProviderKind, model: string) => void;
}) {
  const [customModel, setCustomModel] = useState('');
  const activeKey = keyRefs.find((key) => key.id === currentKeyId) ?? keyRefs[0];

  const currentLabel = (() => {
    if (!currentModel) return 'Select model';
    for (const key of keyRefs) {
      const found = modelsForKey(key.provider, modelsByKey[key.id] ?? []).find(
        (model) => model.id === currentModel,
      );
      if (found) return found.label;
    }
    return currentModel;
  })();

  return (
    <Popover
      align="start"
      panelClassName="w-80"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex h-8 max-w-52 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-raised px-2.5 text-xs font-medium text-ink transition-colors hover:bg-surface"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronDown size={12} className="shrink-0 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div>
          {keyRefs.length === 0 && (
            <div className="px-2.5 py-3 text-xs text-muted">
              No providers configured.{' '}
              <Link href="/settings/providers" className="text-accent hover:underline">
                Add an API key
              </Link>{' '}
              to start chatting.
            </div>
          )}
          {keyRefs.map((key) => {
            const models = modelsForKey(key.provider, modelsByKey[key.id] ?? []);
            return (
              <section key={key.id} className="mb-1">
                <h4 className="label px-2.5 py-1.5">{key.label}</h4>
                {models.length === 0 && (
                  <p className="px-2.5 pb-1 text-xs text-muted">
                    No cached models — type a model id below or refresh the catalog in Settings.
                  </p>
                )}
                {models.slice(0, 30).map((model) => {
                  const selected = key.id === currentKeyId && model.id === currentModel;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelect(key.id, key.provider, model.id);
                        close();
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors hover:bg-surface',
                        selected && 'bg-accent-soft',
                      )}
                    >
                      <span className="truncate">{model.label}</span>
                      {selected && <Check size={13} className="shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </section>
            );
          })}
          {activeKey && (
            <form
              className="mt-1 flex gap-1.5 border-t border-line p-2"
              onSubmit={(event) => {
                event.preventDefault();
                const model = customModel.trim();
                if (!model) return;
                onSelect(activeKey.id, activeKey.provider, model);
                setCustomModel('');
                close();
              }}
            >
              <Input
                value={customModel}
                onChange={(event) => setCustomModel(event.target.value)}
                placeholder="Any model id…"
                aria-label="Custom model id"
                className="h-8 text-xs"
              />
              <button
                type="submit"
                className="h-8 shrink-0 cursor-pointer rounded-md bg-ink px-2.5 text-xs font-medium text-paper hover:opacity-85"
              >
                Use
              </button>
            </form>
          )}
        </div>
      )}
    </Popover>
  );
}
