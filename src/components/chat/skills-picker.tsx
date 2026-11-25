'use client';

import { Check, Wand2 } from 'lucide-react';

import { Popover } from '@/components/ui/popover';
import { BUILTIN_SKILLS } from '@/lib/skills';
import type { Skill } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SkillsPicker({
  enabled,
  customSkills,
  onToggle,
}: {
  enabled: string[];
  customSkills: Pick<Skill, 'id' | 'name' | 'description'>[];
  onToggle: (key: string) => void;
}) {
  return (
    <Popover
      align="start"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title="Skills"
          className={cn(
            'flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
            enabled.length > 0
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-line bg-raised text-ink hover:bg-surface',
          )}
        >
          <Wand2 size={13} />
          Skills
          {enabled.length > 0 && <span className="tabular-nums">{enabled.length}</span>}
        </button>
      )}
    >
      <div>
        <h4 className="label px-2.5 py-1.5">Built-in</h4>
        {BUILTIN_SKILLS.map((skill) => {
          const active = enabled.includes(skill.key);
          return (
            <button
              key={skill.key}
              type="button"
              onClick={() => onToggle(skill.key)}
              className="flex w-full cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                  active ? 'border-accent bg-accent text-white' : 'border-line',
                )}
              >
                {active && <Check size={11} />}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-medium">{skill.name}</span>
                <span className="block text-xs leading-snug text-muted">{skill.description}</span>
              </span>
            </button>
          );
        })}
        {customSkills.length > 0 && (
          <>
            <h4 className="label mt-1 px-2.5 py-1.5">Custom</h4>
            {customSkills.map((skill) => {
              const active = enabled.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => onToggle(skill.id)}
                  className="flex w-full cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                      active ? 'border-accent bg-accent text-white' : 'border-line',
                    )}
                  >
                    {active && <Check size={11} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] font-medium">{skill.name}</span>
                    {skill.description && (
                      <span className="block text-xs leading-snug text-muted">
                        {skill.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </Popover>
  );
}
