import 'server-only';

import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import { loadPdfFonts } from '@/lib/ai/fonts';
import { builtinSkill, BUILTIN_SKILLS } from '@/lib/skills';
import { createAdminClient } from '@/lib/supabase/admin';

import { saveArtifact, type ToolContext } from './artifacts';
import { buildDocx, documentInputSchema } from './document';
import { htmlInputSchema, normalizeHtml } from './html';
import { buildPdf, pdfInputSchema } from './pdf';
import { buildPptx, presentationInputSchema } from './presentation';

export type { ToolContext } from './artifacts';

const MIME = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  html: 'text/html; charset=utf-8',
} as const;

const MAX_KNOWLEDGE_CHARS = 24_000;

export interface BuildToolsOptions {
  agentMode: boolean;
  enabledSkillKeys: string[];
}

export function buildTools(ctx: ToolContext, options: BuildToolsOptions): ToolSet {
  const enabled = new Set<string>();
  if (options.agentMode) {
    for (const skill of BUILTIN_SKILLS) {
      for (const name of skill.tools) enabled.add(name);
    }
  } else {
    for (const key of options.enabledSkillKeys) {
      for (const name of builtinSkill(key)?.tools ?? []) enabled.add(name);
    }
  }

  const tools: ToolSet = {};

  if (enabled.has('createPresentation')) {
    tools.createPresentation = tool({
      description:
        'Create a downloadable PPTX presentation with a clean editorial design. Returns an artifact card the user can download.',
      inputSchema: presentationInputSchema,
      execute: async (input) => {
        const bytes = await buildPptx(input);
        return saveArtifact(ctx, {
          kind: 'presentation',
          title: input.title,
          bytes,
          mimeType: MIME.pptx,
          meta: { slides: input.slides.length + 1 },
        });
      },
    });
  }

  if (enabled.has('createPdf')) {
    tools.createPdf = tool({
      description:
        'Create a typeset PDF document (Unicode-safe, incl. Cyrillic). Returns an artifact card the user can download.',
      inputSchema: pdfInputSchema,
      execute: async (input) => {
        const fonts = await loadPdfFonts(ctx.origin);
        const bytes = await buildPdf(input, fonts);
        return saveArtifact(ctx, {
          kind: 'pdf',
          title: input.title,
          bytes,
          mimeType: MIME.pdf,
          meta: { sections: input.sections.length },
        });
      },
    });
  }

  if (enabled.has('createDocument')) {
    tools.createDocument = tool({
      description:
        'Create an editable DOCX document. Returns an artifact card the user can download.',
      inputSchema: documentInputSchema,
      execute: async (input) => {
        const bytes = await buildDocx(input);
        return saveArtifact(ctx, {
          kind: 'document',
          title: input.title,
          bytes,
          mimeType: MIME.docx,
          meta: { sections: input.sections.length },
        });
      },
    });
  }

  if (enabled.has('createHtmlArtifact')) {
    tools.createHtmlArtifact = tool({
      description:
        'Create a self-contained HTML page (inline CSS/JS, no external requests). Shown in a sandboxed preview and downloadable.',
      inputSchema: htmlInputSchema,
      execute: async (input) => {
        const html = normalizeHtml(input);
        return saveArtifact(ctx, {
          kind: 'html',
          title: input.title,
          bytes: Buffer.from(html, 'utf8'),
          mimeType: MIME.html,
        });
      },
    });
  }

  if (ctx.projectFiles.length > 0) {
    tools.listProjectFiles = tool({
      description: 'List the knowledge files attached to this project.',
      inputSchema: z.object({}),
      execute: async () =>
        ctx.projectFiles.map((file) => ({ id: file.id, name: file.name, type: file.mime_type })),
    });

    tools.readProjectFile = tool({
      description: 'Read a project knowledge file by id (from listProjectFiles).',
      inputSchema: z.object({ fileId: z.string().describe('Project file id') }),
      execute: async ({ fileId }) => {
        const file = ctx.projectFiles.find((entry) => entry.id === fileId);
        if (!file) throw new Error(`Unknown project file: ${fileId}`);

        if (file.extracted_text) {
          const text = file.extracted_text.slice(0, MAX_KNOWLEDGE_CHARS);
          const truncated = file.extracted_text.length > MAX_KNOWLEDGE_CHARS;
          return { name: file.name, text, truncated };
        }

        const admin = createAdminClient();
        const { data, error } = await admin.storage
          .from('chat-project-files')
          .createSignedUrl(file.storage_path, 3600);
        if (error || !data) throw new Error(`Could not sign file URL: ${error?.message}`);
        return {
          name: file.name,
          url: data.signedUrl,
          note: 'Binary file without extracted text; use the URL if the model supports it.',
        };
      },
    });
  }

  return tools;
}
