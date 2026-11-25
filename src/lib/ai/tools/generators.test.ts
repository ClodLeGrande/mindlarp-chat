import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildDocx } from './document';
import { normalizeHtml } from './html';
import { buildPdf } from './pdf';
import { buildPptx } from './presentation';

const fontsDir = path.resolve(__dirname, '../../../../public/fonts');

function loadFonts() {
  return {
    regular: new Uint8Array(readFileSync(path.join(fontsDir, 'NotoSans-Regular.ttf'))),
    bold: new Uint8Array(readFileSync(path.join(fontsDir, 'NotoSans-Bold.ttf'))),
    italic: new Uint8Array(readFileSync(path.join(fontsDir, 'NotoSans-Italic.ttf'))),
  };
}

describe('buildPptx', () => {
  it('produces a valid PPTX (zip) container', async () => {
    const buffer = await buildPptx({
      title: 'Pitch deck',
      subtitle: 'MindLarp',
      slides: [
        { title: 'Problem', bullets: ['Too many tabs', 'No shared context'] },
        { title: 'Solution', section: true },
        { title: 'Ask', body: 'Seed round.', notes: 'Speaker note' },
      ],
    });
    expect(buffer.byteLength).toBeGreaterThan(5000);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });
});

describe('buildPdf', () => {
  it('produces a PDF with embedded unicode fonts', async () => {
    const buffer = await buildPdf(
      {
        title: 'Отчёт о запуске',
        subtitle: 'Подзаголовок',
        sections: [
          {
            heading: 'Итоги',
            paragraphs: [
              'Первый абзац с кириллицей и достаточно длинным текстом, чтобы проверить перенос строк по ширине страницы.',
            ],
            bullets: ['Пункт один', 'Пункт два'],
          },
        ],
      },
      loadFonts(),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.byteLength).toBeGreaterThan(10_000);
  });

  it('handles long documents with page breaks', async () => {
    const buffer = await buildPdf(
      {
        title: 'Long document',
        sections: Array.from({ length: 40 }, (_, index) => ({
          heading: `Section ${index + 1}`,
          paragraphs: ['Lorem ipsum dolor sit amet. '.repeat(12)],
        })),
      },
      loadFonts(),
    );
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBeGreaterThan(3);
  });
});

describe('buildDocx', () => {
  it('produces a DOCX (zip) container', async () => {
    const buffer = await buildDocx({
      title: 'Brief',
      sections: [{ heading: 'Scope', paragraphs: ['Everything.'], bullets: ['A', 'B'] }],
    });
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.byteLength).toBeGreaterThan(2000);
  });
});

describe('normalizeHtml', () => {
  it('passes a full document through', () => {
    const html = '<!doctype html><html><body><p>Hi</p></body></html>';
    expect(normalizeHtml({ title: 'T', html })).toBe(html);
  });

  it('wraps a fragment into a complete page', () => {
    const result = normalizeHtml({ title: 'T', html: '<p>Fragment</p>' });
    expect(result).toContain('<html');
    expect(result).toContain('<p>Fragment</p>');
    expect(result).toContain('viewport');
  });

  it('escapes the title', () => {
    const result = normalizeHtml({ title: '<script>', html: '<p>x</p>' });
    expect(result).toContain('&lt;script&gt;');
  });
});
