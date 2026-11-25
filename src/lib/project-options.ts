export const PROJECT_ICONS = [
  'folder',
  'sparkles',
  'book',
  'code',
  'flask',
  'globe',
  'briefcase',
  'heart',
] as const;

export const PROJECT_COLORS = ['cobalt', 'moss', 'amber', 'plum', 'slate', 'rust'] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const COLOR_CLASSES: Record<ProjectColor, { dot: string; soft: string; text: string }> = {
  cobalt: { dot: 'bg-[#0f3ddb]', soft: 'bg-[#e9edfd]', text: 'text-[#0f3ddb]' },
  moss: { dot: 'bg-[#3d6b35]', soft: 'bg-[#e7efe4]', text: 'text-[#3d6b35]' },
  amber: { dot: 'bg-[#9a6700]', soft: 'bg-[#f5ecd7]', text: 'text-[#9a6700]' },
  plum: { dot: 'bg-[#7a3fa8]', soft: 'bg-[#efe6f6]', text: 'text-[#7a3fa8]' },
  slate: { dot: 'bg-[#4a5568]', soft: 'bg-[#e8ebf0]', text: 'text-[#4a5568]' },
  rust: { dot: 'bg-[#b0432f]', soft: 'bg-[#f6e6e1]', text: 'text-[#b0432f]' },
};

export function colorClasses(color: string) {
  return COLOR_CLASSES[
    (PROJECT_COLORS as readonly string[]).includes(color) ? (color as ProjectColor) : 'cobalt'
  ];
}
