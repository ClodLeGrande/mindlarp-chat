import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { z } from 'zod';

import type { PdfFonts } from '../fonts';

export const pdfInputSchema = z.object({
  title: z.string().describe('Document title'),
  subtitle: z.string().optional().describe('Optional subtitle shown under the title'),
  sections: z
    .array(
      z.object({
        heading: z.string().optional().describe('Section heading'),
        paragraphs: z.array(z.string()).optional().describe('Prose paragraphs'),
        bullets: z.array(z.string()).optional().describe('Bullet list items'),
      }),
    )
    .min(1)
    .describe('Document sections in order'),
});

export type PdfInput = z.infer<typeof pdfInputSchema>;

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_ZONE = 40;

const INK = rgb(0.1, 0.1, 0.09);
const MUTED = rgb(0.42, 0.4, 0.37);
const ACCENT = rgb(0.06, 0.24, 0.86);
const HAIRLINE = rgb(0.89, 0.88, 0.85);

interface TextOptions {
  font: PDFFont;
  size: number;
  lineHeight: number;
  color?: ReturnType<typeof rgb>;
  indent?: number;
  spaceAfter?: number;
}

class PdfLayout {
  private doc: PDFDocument;
  private page: PDFPage;
  private cursorY: number;
  private fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont };

  constructor(doc: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont }) {
    this.doc = doc;
    this.fonts = fonts;
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.cursorY = MARGIN;
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.cursorY = MARGIN;
  }

  private ensureSpace(height: number) {
    if (this.cursorY + height > PAGE_HEIGHT - MARGIN - FOOTER_ZONE) {
      this.newPage();
    }
  }

  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const rawLine of text.split('\n')) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push('');
        continue;
      }
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
          // Hard-break words longer than the line itself.
          while (font.widthOfTextAtSize(current, size) > width) {
            let cut = current.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(current.slice(0, cut), size) > width) {
              cut -= 1;
            }
            lines.push(current.slice(0, cut));
            current = current.slice(cut);
          }
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  text(text: string, options: TextOptions) {
    const { font, size, lineHeight, color = INK, indent = 0, spaceAfter = 0 } = options;
    const width = CONTENT_WIDTH - indent;
    const lines = this.wrap(text, font, size, width);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      if (line) {
        this.page.drawText(line, {
          x: MARGIN + indent,
          y: PAGE_HEIGHT - this.cursorY - size,
          size,
          font,
          color,
        });
      }
      this.cursorY += lineHeight;
    }
    this.cursorY += spaceAfter;
  }

  bullet(text: string) {
    const size = 11;
    const lineHeight = 16;
    const indent = 16;
    const lines = this.wrap(text, this.fonts.regular, size, CONTENT_WIDTH - indent);
    lines.forEach((line, index) => {
      this.ensureSpace(lineHeight);
      if (index === 0) {
        this.page.drawText('•', {
          x: MARGIN,
          y: PAGE_HEIGHT - this.cursorY - size,
          size,
          font: this.fonts.regular,
          color: ACCENT,
        });
      }
      if (line) {
        this.page.drawText(line, {
          x: MARGIN + indent,
          y: PAGE_HEIGHT - this.cursorY - size,
          size,
          font: this.fonts.regular,
          color: INK,
        });
      }
      this.cursorY += lineHeight;
    });
    this.cursorY += 3;
  }

  rule(spaceBefore = 6, spaceAfter = 14) {
    this.ensureSpace(spaceBefore + spaceAfter + 2);
    this.cursorY += spaceBefore;
    this.page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - this.cursorY },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - this.cursorY },
      thickness: 0.75,
      color: HAIRLINE,
    });
    this.cursorY += spaceAfter;
  }

  gap(height: number) {
    this.cursorY += height;
  }

  finish(title: string) {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN, y: MARGIN - 14 },
        end: { x: PAGE_WIDTH - MARGIN, y: MARGIN - 14 },
        thickness: 0.5,
        color: HAIRLINE,
      });
      page.drawText('MINDLARP CHAT', {
        x: MARGIN,
        y: MARGIN - 28,
        size: 7.5,
        font: this.fonts.regular,
        color: MUTED,
      });
      const label = `${index + 1} / ${pages.length}`;
      const width = this.fonts.regular.widthOfTextAtSize(label, 7.5);
      page.drawText(label, {
        x: PAGE_WIDTH - MARGIN - width,
        y: MARGIN - 28,
        size: 7.5,
        font: this.fonts.regular,
        color: MUTED,
      });
    });
    this.doc.setTitle(title);
    this.doc.setProducer('MindLarp Chat');
    this.doc.setCreator('MindLarp Chat');
    this.doc.setCreationDate(new Date());
  }
}

export async function buildPdf(input: PdfInput, fonts: PdfFonts): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });
  const italic = await doc.embedFont(fonts.italic, { subset: true });

  const layout = new PdfLayout(doc, { regular, bold, italic });

  layout.text(input.title, { font: bold, size: 24, lineHeight: 30, spaceAfter: 4 });
  if (input.subtitle) {
    layout.text(input.subtitle, { font: italic, size: 12, lineHeight: 17, color: MUTED });
  }
  layout.rule(10, 18);

  for (const section of input.sections) {
    if (section.heading) {
      layout.gap(6);
      layout.text(section.heading, { font: bold, size: 14, lineHeight: 20, spaceAfter: 6 });
    }
    for (const paragraph of section.paragraphs ?? []) {
      layout.text(paragraph, { font: regular, size: 11, lineHeight: 16, spaceAfter: 8 });
    }
    for (const item of section.bullets ?? []) {
      layout.bullet(item);
    }
    layout.gap(6);
  }

  layout.finish(input.title);
  const bytes = await doc.save();
  return Buffer.from(bytes);
}
