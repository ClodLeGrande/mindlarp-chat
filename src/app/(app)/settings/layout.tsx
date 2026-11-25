'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/settings', label: 'General' },
  { href: '/settings/providers', label: 'Providers & keys' },
  { href: '/settings/generation', label: 'Generation' },
  { href: '/settings/appearance', label: 'Appearance' },
  { href: '/settings/data', label: 'Data & export' },
  { href: '/settings/integration', label: 'Integration' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        <header className="mb-6">
          <p className="label mb-2">Preferences</p>
          <h1 className="font-display text-4xl">Settings</h1>
        </header>
        <nav className="mb-8 flex flex-wrap gap-1 border-b border-line pb-px">
          {SECTIONS.map((section) => {
            const active = pathname === section.href;
            return (
              <Link
                key={section.href}
                href={section.href}
                className={cn(
                  '-mb-px rounded-t-md border-b-2 px-3 py-2 text-[0.8125rem] font-medium transition-colors',
                  active
                    ? 'border-accent text-ink'
                    : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
