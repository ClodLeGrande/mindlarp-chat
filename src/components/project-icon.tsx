import {
  Book,
  Briefcase,
  Code,
  FlaskConical,
  Folder,
  Globe,
  Heart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  sparkles: Sparkles,
  book: Book,
  code: Code,
  flask: FlaskConical,
  globe: Globe,
  briefcase: Briefcase,
  heart: Heart,
};

export function ProjectIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const Component = ICONS[icon] ?? Folder;
  return <Component size={size} aria-hidden />;
}
