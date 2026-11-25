import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProjectIcon } from '@/components/project-icon';
import { NewProjectButton } from '@/components/projects/project-actions';
import { EmptyState } from '@/components/ui/misc';
import { loadProviderCatalog } from '@/lib/page-data';
import { colorClasses } from '@/lib/project-options';
import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/lib/types';
import { cn, formatRelativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [{ data: projects }, catalog] = await Promise.all([
    supabase
      .schema('chat')
      .from('projects')
      .select('*, conversations(count)')
      .eq('archived', false)
      .order('updated_at', { ascending: false }),
    loadProviderCatalog(user.id),
  ]);

  const rows = (projects ?? []) as (Project & { conversations: { count: number }[] })[];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label mb-2">Workspace</p>
            <h1 className="font-display text-4xl">Projects</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Group chats around a goal. Each project carries its own instructions, knowledge files
              and defaults.
            </p>
          </div>
          <NewProjectButton keyRefs={catalog.keyRefs} modelsByKey={catalog.modelsByKey} />
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create a project to give your chats shared instructions and files."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((project) => {
              const colors = colorClasses(project.color);
              const count = project.conversations?.[0]?.count ?? 0;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group rounded-lg border border-line bg-raised p-5 transition-colors hover:border-accent/40"
                >
                  <span
                    className={cn(
                      'mb-4 flex h-10 w-10 items-center justify-center rounded-md',
                      colors.soft,
                      colors.text,
                    )}
                  >
                    <ProjectIcon icon={project.icon} size={18} />
                  </span>
                  <h2 className="text-base font-semibold group-hover:text-accent">
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-[0.8125rem] text-muted">
                      {project.description}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-muted">
                    {count} {count === 1 ? 'chat' : 'chats'} · updated{' '}
                    {formatRelativeTime(project.updated_at)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
