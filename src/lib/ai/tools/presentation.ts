import pptxgen from 'pptxgenjs';
import { z } from 'zod';

export const presentationInputSchema = z.object({
  title: z.string().describe('Deck title shown on the cover slide'),
  subtitle: z.string().optional().describe('Optional cover subtitle or author line'),
  theme: z.enum(['light', 'dark']).optional().describe('Cover theme, defaults to light'),
  slides: z
    .array(
      z.object({
        title: z.string().describe('Slide headline'),
        bullets: z.array(z.string()).optional().describe('Short bullet points, max ~6'),
        body: z.string().optional().describe('Optional paragraph instead of bullets'),
        section: z.boolean().optional().describe('Render as a dark section divider slide'),
        notes: z.string().optional().describe('Speaker notes'),
      }),
    )
    .min(1)
    .describe('Content slides in order'),
});

export type PresentationInput = z.infer<typeof presentationInputSchema>;

const PAPER = 'F7F6F3';
const INK = '1A1917';
const MUTED = '6B675E';
const ACCENT = '0F3DDB';
const HAIRLINE = 'E4E1DA';

const DISPLAY_FONT = 'Georgia';
const BODY_FONT = 'Calibri';

export async function buildPptx(input: PresentationInput): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'MINDLARP', width: 13.33, height: 7.5 });
  pptx.layout = 'MINDLARP';
  pptx.author = 'MindLarp Chat';
  pptx.title = input.title;

  const dark = input.theme === 'dark';

  const cover = pptx.addSlide();
  cover.background = { color: dark ? INK : PAPER };
  cover.addShape('rect', { x: 0.9, y: 2.62, w: 0.62, h: 0.045, fill: { color: ACCENT } });
  cover.addText(input.title, {
    x: 0.85,
    y: 2.85,
    w: 11.6,
    h: 1.9,
    fontFace: DISPLAY_FONT,
    fontSize: 44,
    color: dark ? PAPER : INK,
    valign: 'top',
  });
  if (input.subtitle) {
    cover.addText(input.subtitle, {
      x: 0.9,
      y: 4.85,
      w: 11.5,
      h: 0.6,
      fontFace: BODY_FONT,
      fontSize: 16,
      color: dark ? 'B9B5AC' : MUTED,
    });
  }
  cover.addText('MINDLARP CHAT', {
    x: 0.9,
    y: 6.85,
    w: 6,
    h: 0.35,
    fontFace: BODY_FONT,
    fontSize: 9,
    charSpacing: 3,
    color: dark ? 'B9B5AC' : MUTED,
  });

  input.slides.forEach((slide, index) => {
    const rendered = pptx.addSlide();

    if (slide.section) {
      rendered.background = { color: INK };
      rendered.addText(String(index + 1).padStart(2, '0'), {
        x: 0.9,
        y: 2.35,
        w: 3,
        h: 0.5,
        fontFace: BODY_FONT,
        fontSize: 14,
        color: ACCENT,
        charSpacing: 2,
      });
      rendered.addText(slide.title, {
        x: 0.85,
        y: 2.9,
        w: 11.6,
        h: 1.8,
        fontFace: DISPLAY_FONT,
        fontSize: 36,
        color: PAPER,
        valign: 'top',
      });
    } else {
      rendered.background = { color: PAPER };
      rendered.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ACCENT } });
      rendered.addText(slide.title, {
        x: 0.9,
        y: 0.62,
        w: 11.5,
        h: 0.95,
        fontFace: DISPLAY_FONT,
        fontSize: 26,
        color: INK,
        valign: 'top',
      });
      rendered.addShape('line', {
        x: 0.9,
        y: 1.72,
        w: 11.53,
        h: 0,
        line: { color: HAIRLINE, width: 1 },
      });

      if (slide.body) {
        rendered.addText(slide.body, {
          x: 0.9,
          y: 2.05,
          w: 11.5,
          h: 4.6,
          fontFace: BODY_FONT,
          fontSize: 16,
          color: INK,
          valign: 'top',
          lineSpacingMultiple: 1.25,
        });
      }

      if (slide.bullets?.length) {
        rendered.addText(
          slide.bullets.map((text) => ({
            text,
            options: { bullet: { characterCode: '2022', indent: 14 }, breakLine: true },
          })),
          {
            x: 0.9,
            y: 2.05,
            w: 11.5,
            h: 4.6,
            fontFace: BODY_FONT,
            fontSize: 16,
            color: INK,
            valign: 'top',
            paraSpaceAfter: 12,
          },
        );
      }

      rendered.addText(`${index + 1}`, {
        x: 12.35,
        y: 6.95,
        w: 0.6,
        h: 0.35,
        fontFace: BODY_FONT,
        fontSize: 10,
        color: MUTED,
        align: 'right',
      });
    }

    if (slide.notes) rendered.addNotes(slide.notes);
  });

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return output as Buffer;
}
