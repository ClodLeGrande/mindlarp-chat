import 'server-only';

import { randomUUID } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ArtifactKind, ArtifactToolOutput } from '@/lib/types';

export interface ToolContext {
  userId: string;
  conversationId: string;
  origin: string;
  projectFiles: {
    id: string;
    name: string;
    mime_type: string;
    storage_path: string;
    extracted_text: string;
  }[];
}

const EXTENSIONS: Record<ArtifactKind, string> = {
  presentation: 'pptx',
  pdf: 'pdf',
  document: 'docx',
  html: 'html',
};

export async function saveArtifact(
  ctx: ToolContext,
  artifact: {
    kind: ArtifactKind;
    title: string;
    bytes: Buffer | Uint8Array;
    mimeType: string;
    meta?: Record<string, unknown>;
  },
): Promise<ArtifactToolOutput> {
  const admin = createAdminClient();
  const extension = EXTENSIONS[artifact.kind];
  const storagePath = `${ctx.userId}/${ctx.conversationId}/${randomUUID()}.${extension}`;
  const bytes = Buffer.isBuffer(artifact.bytes) ? artifact.bytes : Buffer.from(artifact.bytes);

  const { error: uploadError } = await admin.storage
    .from('chat-artifacts')
    .upload(storagePath, bytes, { contentType: artifact.mimeType });
  if (uploadError) throw new Error(`Artifact upload failed: ${uploadError.message}`);

  const { data, error } = await admin
    .schema('chat')
    .from('artifacts')
    .insert({
      user_id: ctx.userId,
      conversation_id: ctx.conversationId,
      kind: artifact.kind,
      title: artifact.title,
      storage_path: storagePath,
      mime_type: artifact.mimeType,
      size_bytes: bytes.byteLength,
      meta: artifact.meta ?? {},
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Artifact record failed: ${error?.message}`);

  return {
    artifactId: data.id,
    kind: artifact.kind,
    title: artifact.title,
    url: `/api/artifacts/${data.id}`,
    previewUrl: artifact.kind === 'html' ? `/api/artifacts/${data.id}?preview=1` : undefined,
    sizeBytes: bytes.byteLength,
    meta: artifact.meta,
  };
}
