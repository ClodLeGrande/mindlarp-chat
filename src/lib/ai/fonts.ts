import 'server-only';

export interface PdfFonts {
  regular: Uint8Array;
  bold: Uint8Array;
  italic: Uint8Array;
}

let cache: Promise<PdfFonts> | null = null;

/**
 * Load the bundled Noto Sans TTFs (OFL) from this app's own origin so PDFs
 * render Unicode (incl. Cyrillic). Works locally and on Vercel.
 */
export function loadPdfFonts(origin: string): Promise<PdfFonts> {
  if (!cache) {
    cache = (async () => {
      const [regular, bold, italic] = await Promise.all(
        ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf', 'NotoSans-Italic.ttf'].map(async (file) => {
          const response = await fetch(`${origin}/fonts/${file}`);
          if (!response.ok) {
            throw new Error(`Failed to load PDF font ${file} (${response.status}).`);
          }
          return new Uint8Array(await response.arrayBuffer());
        }),
      );
      return { regular, bold, italic };
    })();
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}
