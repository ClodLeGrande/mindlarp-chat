'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { failure, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 200_000;

export interface ProjectInput {
  name: string;
  description: string;
  instructions: string;
  icon: string;
  color: string;
  default_model: string;
  default_provider_key_id: string | null;
  enabled_skills: string[];
  agent_mode: boolean;
}

export async function createProject(input: ProjectInput): Promise<ActionResult<string>> {
  try {
    const { supabase, user } = await requireUser();
    const name = input.name.trim();
    if (!name) throw new Error('Project name is required.');

    const { data, error } = await supabase
      .schema('chat')
      .from('projects')
      .insert({ ...input, name, user_id: user.id })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Could not create the project.');
    revalidatePath('/projects');
    return { ok: true, data: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const name = input.name.trim();
    if (!name) throw new Error('Project name is required.');
    const { error } = await supabase
      .schema('chat')
      .from('projects')
      .update({ ...input, name })
      .eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();

    const { data: files } = await supabase
      .schema('chat')
      .from('project_files')
      .select('storage_path')
      .eq('project_id', id);
    if (files?.length) {
      await supabase.storage
        .from('chat-project-files')
        .remove(files.map((file) => file.storage_path));
    }

    const { error } = await supabase.schema('chat').from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/projects');
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function uploadProjectFile(
  projectId: string,
  formData: FormData,
): Promise<ActionResult<string>> {
  try {
    const { supabase, user } = await requireUser();
    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('No file provided.');
    if (file.size > MAX_FILE_BYTES) throw new Error('File is larger than 20 MB.');

    const { data: project } = await supabase
      .schema('chat')
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) throw new Error('Project not found.');

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const storagePath = `${user.id}/${projectId}/${randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-project-files')
      .upload(storagePath, bytes, { contentType: file.type || 'application/octet-stream' });
    if (uploadError) throw new Error(uploadError.message);

    const extractedText = extractText(file.name, file.type, bytes);

    const { data, error } = await supabase
      .schema('chat')
      .from('project_files')
      .insert({
        project_id: projectId,
        user_id: user.id,
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        extracted_text: extractedText,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Could not save the file.');
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProjectFile(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: file } = await supabase
      .schema('chat')
      .from('project_files')
      .select('storage_path, project_id')
      .eq('id', id)
      .maybeSingle();
    if (!file) throw new Error('File not found.');

    await supabase.storage.from('chat-project-files').remove([file.storage_path]);
    const { error } = await supabase.schema('chat').from('project_files').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${file.project_id}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|ya?ml|toml|ini|log|html?|css|js|mjs|ts|tsx|jsx|py|rb|go|rs|java|c|h|cpp|sh|sql|xml)$/i;

function extractText(name: string, mimeType: string, bytes: Buffer): string {
  const isText =
    mimeType.startsWith('text/') || TEXT_EXTENSIONS.test(name) || mimeType === 'application/json';
  if (!isText) return '';
  return bytes.toString('utf8').slice(0, MAX_EXTRACTED_CHARS);
}
