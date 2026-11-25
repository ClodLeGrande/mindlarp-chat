export interface BuiltinSkill {
  key: string;
  name: string;
  description: string;
  icon: string;
  tools: string[];
  instructions: string;
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    key: 'presentations',
    name: 'Presentations',
    description: 'Build downloadable PPTX slide decks with a clean editorial layout.',
    icon: 'presentation',
    tools: ['createPresentation'],
    instructions: [
      'When the user asks for a presentation, slides or a deck, use the createPresentation tool.',
      'Plan a tight narrative: one idea per slide, short bullets (max 6 per slide, max 12 words each).',
      'Always include a title slide and a closing slide. Put speaker notes in the notes field.',
      'After creating the deck, summarize its structure in one short paragraph.',
    ].join('\n'),
  },
  {
    key: 'pdf',
    name: 'PDF documents',
    description: 'Write typeset PDF documents — reports, letters, briefs, invoices.',
    icon: 'file-text',
    tools: ['createPdf'],
    instructions: [
      'When the user asks for a PDF, report or printable document, use the createPdf tool.',
      'Structure the document with a title, optional subtitle and sections with headings.',
      'Write full prose in paragraphs; use bullets only for genuine lists.',
      'The renderer supports Unicode (including Cyrillic), headings, paragraphs and bullets.',
    ].join('\n'),
  },
  {
    key: 'documents',
    name: 'Word documents',
    description: 'Produce editable DOCX files for further work in Word or Google Docs.',
    icon: 'file-type',
    tools: ['createDocument'],
    instructions: [
      'When the user asks for an editable document or DOCX, use the createDocument tool.',
      'Use clear headings and paragraphs; keep formatting simple and professional.',
    ].join('\n'),
  },
  {
    key: 'html',
    name: 'HTML & visuals',
    description: 'Create self-contained HTML pages — landing sections, diagrams, dashboards.',
    icon: 'globe',
    tools: ['createHtmlArtifact'],
    instructions: [
      'When the user asks for a web page, visual, diagram or interactive artifact, use createHtmlArtifact.',
      'Produce ONE self-contained HTML document: inline CSS and JS, no external requests.',
      'Aim for a refined, minimal design; make it responsive and accessible.',
      'The page is shown in a sandboxed preview and can be downloaded.',
    ].join('\n'),
  },
];

export function builtinSkill(key: string): BuiltinSkill | undefined {
  return BUILTIN_SKILLS.find((skill) => skill.key === key);
}

export function builtinSkillNames(keys: string[]): string[] {
  return keys.map((key) => builtinSkill(key)?.name ?? key);
}
