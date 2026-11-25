'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ProjectForm } from '@/components/projects/project-form';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createConversation } from '@/lib/actions/conversations';
import { deleteProject } from '@/lib/actions/projects';
import type { CatalogModel, Project, ProviderKeyRef } from '@/lib/types';

export function NewProjectButton({
  keyRefs,
  modelsByKey,
}: {
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> New project
      </Button>
      <ProjectForm
        open={open}
        onClose={() => setOpen(false)}
        keyRefs={keyRefs}
        modelsByKey={modelsByKey}
        onSaved={(id) => {
          router.refresh();
          if (id) router.push(`/projects/${id}`);
        }}
      />
    </>
  );
}

export function ProjectActions({
  project,
  keyRefs,
  modelsByKey,
}: {
  project: Project;
  keyRefs: ProviderKeyRef[];
  modelsByKey: Record<string, CatalogModel[]>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  async function handleNewChat() {
    const result = await createConversation(project.id);
    if (result.ok && result.data) router.push(`/chat/${result.data}`);
    else if (!result.ok) setError(result.error);
  }

  async function handleDelete() {
    const result = await deleteProject(project.id);
    if (result.ok) router.push('/projects');
    else setError(result.error);
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil size={13} /> Edit
      </Button>
      <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
        <Trash2 size={13} /> Delete
      </Button>
      <Button size="sm" variant="primary" onClick={() => void handleNewChat()}>
        <Plus size={13} /> New chat
      </Button>

      <ProjectForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        keyRefs={keyRefs}
        modelsByKey={modelsByKey}
        onSaved={() => router.refresh()}
      />

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete project?">
        <p className="text-sm text-muted">
          “{project.name}” and its knowledge files will be removed. Chats in the project are kept,
          but lose their project link.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
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
