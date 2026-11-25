'use client';

import { useState } from 'react';

import { ProjectIcon } from '@/components/project-icon';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/misc';
import { createProject, updateProject, type ProjectInput } from '@/lib/actions/projects';
import { modelsForKey } from '@/lib/models';
import { COLOR_CLASSES, PROJECT_COLORS, PROJECT_ICONS } from '@/lib/project-options';
import { BUILTIN_SKILLS } from '@/lib/skills';
import type { CatalogModel, Project, ProviderKeyRef } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ProjectForm({
  open,
  onClose,
  project,
  keyRefs,
  modelsByKey,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
  onSaved: (id?: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [instructions, setInstructions] = useState(project?.instructions ?? '');
  const [icon, setIcon] = useState(project?.icon ?? 'folder');
  const [color, setColor] = useState(project?.color ?? 'cobalt');
  const [keyId, setKeyId] = useState(project?.default_provider_key_id ?? '');
  const [model, setModel] = useState(project?.default_model ?? '');
  const [agentMode, setAgentMode] = useState(project?.agent_mode ?? false);
  const [skills, setSkills] = useState<string[]>(project?.enabled_skills ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const selectedKey = keyRefs.find((key) => key.id === keyId);
  const modelOptions = selectedKey
    ? modelsForKey(selectedKey.provider, modelsByKey[selectedKey.id] ?? [])
    : [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');

    const input: ProjectInput = {
      name,
      description,
      instructions,
      icon,
      color,
      default_model: model,
      default_provider_key_id: keyId || null,
      enabled_skills: skills,
      agent_mode: agentMode,
    };

    const result = project ? await updateProject(project.id, input) : await createProject(input);
    setPending(false);
    if (result.ok) {
      onSaved(project ? undefined : result.data);
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={project ? 'Edit project' : 'New project'} wide>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="project-name">
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
              autoFocus
            />
          </Field>
          <Field label="Description" htmlFor="project-description">
            <Input
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
            />
          </Field>
        </div>

        <Field
          label="Instructions"
          htmlFor="project-instructions"
          hint="Injected into every chat in this project."
        >
          <Textarea
            id="project-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={4}
            placeholder="You are helping with… Always… Never…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_ICONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Icon ${option}`}
                  onClick={() => setIcon(option)}
                  className={cn(
                    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition-colors',
                    icon === option
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-muted hover:bg-surface',
                  )}
                >
                  <ProjectIcon icon={option} size={14} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Color ${option}`}
                  onClick={() => setColor(option)}
                  className={cn(
                    'h-8 w-8 cursor-pointer rounded-md border-2 transition-colors',
                    color === option ? 'border-ink' : 'border-transparent',
                  )}
                >
                  <span
                    className={cn('block h-full w-full rounded-sm', COLOR_CLASSES[option].dot)}
                  />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default provider" htmlFor="project-key">
            <Select
              id="project-key"
              value={keyId}
              onChange={(event) => setKeyId(event.target.value)}
            >
              <option value="">Account default</option>
              {keyRefs.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Default model" htmlFor="project-model">
            <Input
              id="project-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="Account default"
              list="project-model-options"
            />
            <datalist id="project-model-options">
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Skills enabled by default">
          <div className="flex flex-wrap gap-1.5">
            {BUILTIN_SKILLS.map((skill) => {
              const active = skills.includes(skill.key);
              return (
                <button
                  key={skill.key}
                  type="button"
                  onClick={() =>
                    setSkills(
                      active
                        ? skills.filter((entry) => entry !== skill.key)
                        : [...skills, skill.key],
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

        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={agentMode} onChange={setAgentMode} label="Agent mode by default" />
          Agent mode by default
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending && <Spinner className="border-paper/40 border-t-paper" />}
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
