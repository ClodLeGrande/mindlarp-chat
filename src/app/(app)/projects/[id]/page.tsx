import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProjectIcon } from '@/components/project-icon';
import { ProjectActions } from '@/components/projects/project-actions';
import { ProjectFiles } from '@/components/projects/project-files';
import { Badge } from '@/components/ui/misc';
import { loadProviderCatalog } from '@/lib/page-data';
import { colorClasses } from '@/lib/project-options';
import { builtinSkillNames } from '@/lib/skills';
import { createClient } from '@/lib/supabase/server';
import type { Conversation, Project, ProjectFile } from '@/lib/types';
import { cn, formatRelativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Project' };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .schema('chat')
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

  const typedProject = project as Project;
  const [filesResult, conversationsResult, catalog] = await Promise.all([
    supabase
      .schema('chat')
      .from('project_files')
      .select('*')
      .eq('project_id', id)
      .order('created_at'),
    supabase
      .schema('chat')
      .from('conversations')
      .select('id, title, last_message_at')
      .eq('project_id', id)
      .eq('archived', false)
      .order('last_message_at', { ascending: false })
      .limit(50),
    loadProviderCatalog(user.id),
  ]);

  const colors = colorClasses(typedProject.color);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        <Link href="/projects" className="label hover:text-ink">
          ← Projects
        </Link>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                colors.soft,
                colors.text,
              )}
            >
              <ProjectIcon icon={typedProject.icon} size={22} />
            </span>
            <div>
              <h1 className="font-display text-3xl">{typedProject.name}</h1>
              {typedProject.description && (
                <p className="mt-1 max-w-lg text-sm text-muted">{typedProject.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {typedProject.agent_mode && <Badge tone="accent">Agent mode</Badge>}
                {builtinSkillNames(typedProject.enabled_skills).map((name) => (
                  <Badge key={name}>{name}</Badge>
                ))}
                {typedProject.default_model && <Badge>{typedProject.default_model}</Badge>}
              </div>
            </div>
          </div>
          <ProjectActions
            project={typedProject}
            keyRefs={catalog.keyRefs}
            modelsByKey={catalog.modelsByKey}
          />
        </header>

        <section className="mb-8">
          <h2 className="label mb-3">Instructions</h2>
          {typedProject.instructions ? (
            <p className="rounded-lg border border-line bg-raised px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {typedProject.instructions}
            </p>
          ) : (
            <p className="text-sm text-muted">
              No instructions yet — add them via Edit to steer every chat in this project.
            </p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="label mb-3">Knowledge files</h2>
          <ProjectFiles projectId={id} files={(filesResult.data ?? []) as ProjectFile[]} />
        </section>

        <section>
          <h2 className="label mb-3">Chats</h2>
          {(conversationsResult.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No chats in this project yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
              {(conversationsResult.data as Conversation[]).map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`/chat/${conversation.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-surface"
                  >
                    <span className="truncate">{conversation.title}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatRelativeTime(conversation.last_message_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
