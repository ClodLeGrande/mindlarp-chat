'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/misc';
import { createSkill, deleteSkill, updateSkill } from '@/lib/actions/skills';
import type { Skill } from '@/lib/types';

export function SkillsManager({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Skill | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Skill | null>(null);
  const [error, setError] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Custom skills are instruction packs you can toggle per chat.
        </p>
        <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
          <Plus size={13} /> New skill
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {skills.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No custom skills yet. Example: “Answer as a senior legal reviewer, cite clauses.”
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <li key={skill.id} className="rounded-lg border border-line bg-raised p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
                  {skill.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{skill.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium ${
                    skill.enabled ? 'bg-accent-soft text-accent' : 'bg-surface text-muted'
                  }`}
                >
                  {skill.enabled ? 'available' : 'disabled'}
                </span>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(skill)}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(skill)}>
                  <Trash2 size={12} /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SkillEditor
          skill={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => router.refresh()}
        />
      )}

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete skill?">
        <p className="text-sm text-muted">“{deleting?.name}” will be removed permanently.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!deleting) return;
              const result = await deleteSkill(deleting.id);
              if (!result.ok) setError(result.error);
              setDeleting(null);
              router.refresh();
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SkillEditor({
  skill,
  onClose,
  onSaved,
}: {
  skill?: Skill;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(skill?.name ?? '');
  const [description, setDescription] = useState(skill?.description ?? '');
  const [instructions, setInstructions] = useState(skill?.instructions ?? '');
  const [enabled, setEnabled] = useState(skill?.enabled ?? true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    const input = { name, description, instructions, enabled };
    const result = skill ? await updateSkill(skill.id, input) : await createSkill(input);
    setPending(false);
    if (result.ok) {
      onSaved();
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title={skill ? 'Edit skill' : 'New skill'} wide>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="skill-name">
            <Input
              id="skill-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              autoFocus
            />
          </Field>
          <Field label="Description" htmlFor="skill-description">
            <Input
              id="skill-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={160}
            />
          </Field>
        </div>
        <Field
          label="Instructions"
          htmlFor="skill-instructions"
          hint="Added to the system prompt when this skill is enabled in a chat."
        >
          <Textarea
            id="skill-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={6}
            required
            placeholder="You are… Always… Prefer…"
          />
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={enabled} onChange={setEnabled} label="Skill enabled" />
          Available in the skills picker
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending && <Spinner className="border-paper/40 border-t-paper" />}
            {skill ? 'Save changes' : 'Create skill'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
