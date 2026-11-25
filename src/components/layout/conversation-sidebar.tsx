'use client';

import { MoreHorizontal, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { ProjectIcon } from '@/components/project-icon';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { Popover } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/misc';
import {
  createConversation,
  deleteConversation,
  renameConversation,
  toggleConversationPin,
} from '@/lib/actions/conversations';
import { colorClasses } from '@/lib/project-options';
import type { Conversation, Project } from '@/lib/types';
import { cn, dayBucket } from '@/lib/utils';

export function ConversationSidebar({
  conversations,
  projects,
  onNavigate,
}: {
  conversations: Conversation[];
  projects: Project[];
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(query))
      : conversations;

    const pinned = filtered.filter((conversation) => conversation.pinned);
    const rest = filtered.filter((conversation) => !conversation.pinned);

    const buckets = new Map<string, Conversation[]>();
    for (const conversation of rest) {
      const bucket = dayBucket(conversation.last_message_at);
      const list = buckets.get(bucket) ?? [];
      list.push(conversation);
      buckets.set(bucket, list);
    }

    const result: { label: string; items: Conversation[] }[] = [];
    if (pinned.length > 0) result.push({ label: 'Pinned', items: pinned });
    for (const label of ['Today', 'Yesterday', 'Previous 7 days', 'Older']) {
      const items = buckets.get(label);
      if (items?.length) result.push({ label, items });
    }
    return result;
  }, [conversations, search]);

  async function handleNewChat() {
    setCreating(true);
    setError('');
    const result = await createConversation();
    setCreating(false);
    if (result.ok && result.data) {
      router.push(`/chat/${result.data}`);
      onNavigate?.();
    } else if (!result.ok) {
      setError(result.error);
    }
  }

  async function handleRename() {
    if (!renaming) return;
    const result = await renameConversation(renaming.id, renameValue);
    if (result.ok) {
      setRenaming(null);
      startTransition(() => router.refresh());
    } else {
      setError(result.error);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteConversation(deleting.id);
    if (result.ok) {
      const wasActive = pathname === `/chat/${deleting.id}`;
      setDeleting(null);
      startTransition(() => router.refresh());
      if (wasActive) router.push('/chat');
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-line p-3">
        <Button variant="primary" onClick={handleNewChat} disabled={creating} className="w-full">
          {creating ? <Spinner className="border-paper/40 border-t-paper" /> : <Plus size={15} />}
          New chat
        </Button>
        <div className="relative">
          <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-8 pl-8 text-[0.8125rem]"
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted">
            {search ? 'Nothing found.' : 'No chats yet. Start a new one.'}
          </p>
        )}
        {groups.map((group) => (
          <section key={group.label} className="mb-3">
            <h3 className="label px-2 py-1.5">{group.label}</h3>
            <ul>
              {group.items.map((conversation) => {
                const active = pathname === `/chat/${conversation.id}`;
                const project = conversation.project_id
                  ? projectById.get(conversation.project_id)
                  : undefined;
                return (
                  <li key={conversation.id} className="group relative">
                    <Link
                      href={`/chat/${conversation.id}`}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-[0.8125rem] transition-colors',
                        active ? 'bg-accent-soft text-ink' : 'text-ink hover:bg-raised',
                      )}
                    >
                      {project && (
                        <span
                          className={cn('shrink-0', colorClasses(project.color).text)}
                          title={project.name}
                        >
                          <ProjectIcon icon={project.icon} size={13} />
                        </span>
                      )}
                      <span className="truncate">{conversation.title}</span>
                    </Link>
                    <div className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Popover
                        side="bottom"
                        align="end"
                        panelClassName="w-44"
                        trigger={({ toggle }) => (
                          <button
                            type="button"
                            onClick={toggle}
                            aria-label={`Actions for ${conversation.title}`}
                            className="cursor-pointer rounded-md p-1 text-muted hover:bg-surface hover:text-ink"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        )}
                      >
                        {(close) => (
                          <>
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.8125rem] hover:bg-surface"
                              onClick={async () => {
                                close();
                                await toggleConversationPin(conversation.id, !conversation.pinned);
                                startTransition(() => router.refresh());
                              }}
                            >
                              {conversation.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                              {conversation.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.8125rem] hover:bg-surface"
                              onClick={() => {
                                close();
                                setRenameValue(conversation.title);
                                setRenaming(conversation);
                              }}
                            >
                              <MoreHorizontal size={13} /> Rename
                            </button>
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.8125rem] text-danger hover:bg-surface"
                              onClick={() => {
                                close();
                                setDeleting(conversation);
                              }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        )}
                      </Popover>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={!!renaming} onClose={() => setRenaming(null)} title="Rename chat">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleRename();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
            maxLength={120}
            aria-label="Chat title"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete chat?">
        <p className="text-sm text-muted">
          “{deleting?.title}” and all of its messages will be permanently removed.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
