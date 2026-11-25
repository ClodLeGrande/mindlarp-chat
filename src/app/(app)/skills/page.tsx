import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SkillsManager } from '@/components/skills/skills-manager';
import { Badge } from '@/components/ui/misc';
import { BUILTIN_SKILLS } from '@/lib/skills';
import { createClient } from '@/lib/supabase/server';
import type { Skill } from '@/lib/types';

export const metadata: Metadata = { title: 'Skills' };

const SKILL_ICONS: Record<string, string> = {
  presentations: '▤',
  pdf: '¶',
  documents: '§',
  html: '◈',
};

export default async function SkillsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: skills } = await supabase
    .schema('chat')
    .from('skills')
    .select('*')
    .order('created_at');

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        <header className="mb-8">
          <p className="label mb-2">Capabilities</p>
          <h1 className="font-display text-4xl">Skills</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Skills extend what the model can do in a chat. Built-in skills produce real files;
            enable them per chat from the composer, or set defaults per project.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="label mb-3">Built-in</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUILTIN_SKILLS.map((skill) => (
              <article key={skill.key} className="rounded-lg border border-line bg-raised p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft font-display text-lg text-accent">
                    {SKILL_ICONS[skill.key] ?? '◈'}
                  </span>
                  <h3 className="text-sm font-semibold">{skill.name}</h3>
                </div>
                <p className="text-[0.8125rem] leading-relaxed text-muted">{skill.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skill.tools.map((toolName) => (
                    <Badge key={toolName} tone="accent">
                      {toolName}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Agent mode enables every built-in skill at once and lets the model chain up to 12 tool
            steps.
          </p>
        </section>

        <section>
          <h2 className="label mb-3">Custom skills</h2>
          <SkillsManager skills={(skills ?? []) as Skill[]} />
        </section>
      </div>
    </div>
  );
}
