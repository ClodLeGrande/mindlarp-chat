'use client';

import { KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { Badge, Spinner } from '@/components/ui/misc';
import { addProviderKey, deleteProviderKey, refreshKeyModels } from '@/lib/actions/keys';
import { PROVIDER_KINDS, PROVIDER_LABELS } from '@/lib/models';
import type { ProviderKey, ProviderKeyRef, ProviderKind } from '@/lib/types';

export function ProvidersManager({
  keys,
  envRefs,
}: {
  keys: ProviderKey[];
  envRefs: ProviderKeyRef[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProviderKey | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    setError('');
    const result = await refreshKeyModels(id);
    setRefreshingId(null);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteProviderKey(deleting.id);
    if (!result.ok) setError(result.error);
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="max-w-md text-sm text-muted">
          Keys are encrypted with AES-256-GCM before storage and never sent back to the browser.
          Requests go straight from the server to the provider.
        </p>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={13} /> Add key
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {keys.length === 0 && envRefs.length === 0 && (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No providers yet. Add an OpenAI, Anthropic, Google or any OpenAI-compatible key (DeepSeek,
          Moonshot, GLM, OpenRouter, Ollama…).
        </p>
      )}

      {keys.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <KeyRound size={15} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {key.label}
                  <Badge>{PROVIDER_LABELS[key.provider]}</Badge>
                </p>
                <p className="truncate text-xs text-muted">
                  {key.key_hint}
                  {key.base_url ? ` · ${key.base_url}` : ''} ·{' '}
                  {key.models.length > 0
                    ? `${key.models.length} models cached`
                    : 'no model catalog yet'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={refreshingId === key.id}
                  onClick={() => void handleRefresh(key.id)}
                  title="Fetch the model catalog from the provider"
                >
                  {refreshingId === key.id ? <Spinner /> : <RefreshCw size={13} />} Models
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(key)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {envRefs.length > 0 && (
        <section>
          <h3 className="label mb-2">Server defaults</h3>
          <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
            {envRefs.map((ref) => (
              <li key={ref.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <KeyRound size={15} className="text-muted" />
                <span className="flex-1">{ref.label}</span>
                <Badge tone="accent">env</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Configured via server environment variables; available to every user of this deployment.
          </p>
        </section>
      )}

      <AddKeyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => router.refresh()}
      />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Remove key?">
        <p className="text-sm text-muted">
          Chats using “{deleting?.label}” will fall back to the account default provider.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            Remove
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AddKeyDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState<ProviderKind>('openai');
  const [label, setLabel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    const result = await addProviderKey({ provider, label, baseUrl, apiKey });
    setPending(false);
    if (result.ok) {
      setApiKey('');
      setLabel('');
      setBaseUrl('');
      onSaved();
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add provider key">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Provider" htmlFor="key-provider">
          <Select
            id="key-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as ProviderKind)}
          >
            {PROVIDER_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PROVIDER_LABELS[kind]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Label" htmlFor="key-label" hint="Shown in model pickers.">
          <Input
            id="key-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={PROVIDER_LABELS[provider]}
            maxLength={60}
          />
        </Field>

        <Field
          label="Base URL"
          htmlFor="key-base-url"
          hint={
            provider === 'openai-compatible'
              ? 'Required. e.g. https://api.deepseek.com/v1 or http://localhost:11434/v1'
              : 'Optional override of the provider API endpoint.'
          }
        >
          <Input
            id="key-base-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={
              provider === 'openai-compatible' ? 'https://api.example.com/v1' : 'Default'
            }
            required={provider === 'openai-compatible'}
          />
        </Field>

        <Field label="API key" htmlFor="key-value">
          <Input
            id="key-value"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            required
            autoComplete="off"
            placeholder="sk-…"
          />
        </Field>

        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending && <Spinner className="border-paper/40 border-t-paper" />}
            Save key
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
