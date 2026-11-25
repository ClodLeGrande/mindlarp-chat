'use client';

import { useState } from 'react';

import { SaveBar, useSettingsSave } from '@/components/settings/settings-form';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { modelsForKey } from '@/lib/models';
import type { CatalogModel, ChatSettings, ProviderKeyRef } from '@/lib/types';

export function GenerationForm({
  settings,
  keyRefs,
  modelsByKey,
}: {
  settings: ChatSettings;
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
}) {
  const [keyId, setKeyId] = useState(settings.default_provider_key_id ?? '');
  const [model, setModel] = useState(settings.default_model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [topP, setTopP] = useState(settings.top_p);
  const [maxTokens, setMaxTokens] = useState(settings.max_tokens);
  const [systemPrompt, setSystemPrompt] = useState(settings.system_prompt);
  const { save, pending, saved, error } = useSettingsSave();

  const selectedKey = keyRefs.find((key) => key.id === keyId);
  const modelOptions = selectedKey
    ? modelsForKey(selectedKey.provider, modelsByKey[selectedKey.id] ?? [])
    : [];

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default provider" htmlFor="default-key">
          <Select id="default-key" value={keyId} onChange={(event) => setKeyId(event.target.value)}>
            <option value="">None — pick per chat</option>
            {keyRefs.map((key) => (
              <option key={key.id} value={key.id}>
                {key.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Default model" htmlFor="default-model">
          <Input
            id="default-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="e.g. gpt-5.2"
            list="default-model-options"
          />
          <datalist id="default-model-options">
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label={`Temperature — ${temperature.toFixed(1)}`} htmlFor="temperature">
        <input
          id="temperature"
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(event) => setTemperature(Number(event.target.value))}
          className="w-full accent-(--accent)"
        />
      </Field>

      <Field label={`Top P — ${topP.toFixed(2)}`} htmlFor="top-p">
        <input
          id="top-p"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={topP}
          onChange={(event) => setTopP(Number(event.target.value))}
          className="w-full accent-(--accent)"
        />
      </Field>

      <Field
        label="Max output tokens"
        htmlFor="max-tokens"
        hint="Upper bound per response; providers may cap this further."
      >
        <Input
          id="max-tokens"
          type="number"
          min={1}
          max={200000}
          value={maxTokens}
          onChange={(event) => setMaxTokens(Number(event.target.value))}
        />
      </Field>

      <Field
        label="Global system prompt"
        htmlFor="system-prompt"
        hint="Prepended to every conversation, before project instructions."
      >
        <Textarea
          id="system-prompt"
          rows={5}
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          placeholder="You are… Always… Never…"
        />
      </Field>

      <SaveBar
        pending={pending}
        saved={saved}
        error={error}
        onSave={() =>
          void save({
            default_provider_key_id: keyId || null,
            default_model: model,
            temperature,
            top_p: topP,
            max_tokens: maxTokens,
            system_prompt: systemPrompt,
          })
        }
      />
    </div>
  );
}
