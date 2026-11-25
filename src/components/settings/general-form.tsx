'use client';

import { useState } from 'react';

import { SaveBar, useSettingsSave } from '@/components/settings/settings-form';
import { Field, Input, Select } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { BUILTIN_SKILLS } from '@/lib/skills';
import type { ChatSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { value: 'auto', label: 'Match the user (auto)' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Russian' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'zh', label: 'Chinese' },
];

export function GeneralForm({ settings }: { settings: ChatSettings }) {
  const [displayName, setDisplayName] = useState(settings.display_name);
  const [language, setLanguage] = useState(settings.response_language);
  const [sendOnEnter, setSendOnEnter] = useState(settings.send_on_enter);
  const [agentMode, setAgentMode] = useState(settings.agent_mode);
  const [skills, setSkills] = useState(settings.enabled_skills);
  const { save, pending, saved, error } = useSettingsSave();

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Field label="Display name" htmlFor="display-name">
        <Input
          id="display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
        />
      </Field>

      <Field
        label="Response language"
        htmlFor="response-language"
        hint="The UI stays English; this steers the language of model answers."
      >
        <Select
          id="response-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-raised px-4 py-3 text-sm">
        <span>
          Send on Enter
          <span className="block text-xs text-muted">Shift+Enter always adds a new line.</span>
        </span>
        <Switch checked={sendOnEnter} onChange={setSendOnEnter} label="Send on Enter" />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-raised px-4 py-3 text-sm">
        <span>
          Agent mode by default
          <span className="block text-xs text-muted">New chats start with tool use enabled.</span>
        </span>
        <Switch checked={agentMode} onChange={setAgentMode} label="Agent mode by default" />
      </label>

      <Field label="Skills enabled by default" hint="Applied to new chats; per-chat overrides win.">
        <div className="flex flex-wrap gap-1.5">
          {BUILTIN_SKILLS.map((skill) => {
            const active = skills.includes(skill.key);
            return (
              <button
                key={skill.key}
                type="button"
                onClick={() =>
                  setSkills(
                    active ? skills.filter((entry) => entry !== skill.key) : [...skills, skill.key],
                  )
                }
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-line text-muted hover:bg-surface',
                )}
              >
                {skill.name}
              </button>
            );
          })}
        </div>
      </Field>

      <SaveBar
        pending={pending}
        saved={saved}
        error={error}
        onSave={() =>
          void save({
            display_name: displayName,
            response_language: language,
            send_on_enter: sendOnEnter,
            agent_mode: agentMode,
            enabled_skills: skills,
          })
        }
      />
    </div>
  );
}
