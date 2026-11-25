import { z } from 'zod';

export const htmlInputSchema = z.object({
  title: z.string().describe('Short artifact title'),
  html: z
    .string()
    .describe('One self-contained HTML document: inline CSS/JS, no external requests'),
});

export type HtmlInput = z.infer<typeof htmlInputSchema>;

/** Accept a full document or a body fragment; always store a complete page. */
export function normalizeHtml(input: HtmlInput): string {
  const trimmed = input.html.trim();
  if (/<html[\s>]/i.test(trimmed)) return trimmed;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(input.title)}</title>`,
    '<style>body{margin:0;font-family:system-ui,sans-serif;color:#1a1917;background:#f7f6f3}</style>',
    '</head>',
    '<body>',
    trimmed,
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
