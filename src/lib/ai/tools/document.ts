import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { z } from 'zod';

export const documentInputSchema = z.object({
  title: z.string().describe('Document title'),
  subtitle: z.string().optional(),
  sections: z
    .array(
      z.object({
        heading: z.string().optional(),
        paragraphs: z.array(z.string()).optional(),
        bullets: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;

export async function buildDocx(input: DocumentInput): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: input.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
  ];

  if (input.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: input.subtitle, italics: true, color: '6B675E' })],
        spacing: { after: 240 },
      }),
    );
  }

  for (const section of input.sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }),
      );
    }
    for (const paragraph of section.paragraphs ?? []) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: paragraph, size: 22 })],
          spacing: { after: 160, line: 300 },
        }),
      );
    }
    for (const item of section.bullets ?? []) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: item, size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 80 },
        }),
      );
    }
  }

  const doc = new Document({
    creator: 'MindLarp Chat',
    title: input.title,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
