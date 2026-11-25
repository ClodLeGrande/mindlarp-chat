'use client';

import {
  BarChart3,
  FolderKanban,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  Wand2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { ConversationSidebar } from '@/components/layout/conversation-sidebar';
import { Popover } from '@/components/ui/popover';
import { useMounted, useTheme } from '@/components/theme-provider';
import type { Conversation, Project } from '@/lib/types';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/chat', label: 'Chats', icon: MessageSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/skills', label: 'Skills', icon: Wand2 },
  { href: '/usage', label: 'Usage', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  userEmail,
  userName,
  conversations,
  projects,
  children,
}: {
  userEmail: string;
  userName: string;
  conversations: Conversation[];
  projects: Project[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { resolved, setTheme } = useTheme();
  const mounted = useMounted();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isChatArea = pathname.startsWith('/chat');

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Icon rail */}
      <nav className="hidden w-14 shrink-0 flex-col items-center border-r border-line bg-surface py-3 md:flex">
        <Link
          href="/chat"
          className="font-display mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-ink text-lg text-paper"
          aria-label="MindLarp Chat home"
        >
          M
        </Link>
        <div className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-raised hover:text-ink',
                )}
              >
                <item.icon size={17} />
              </Link>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            aria-label="Toggle theme"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            {mounted && resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Popover
            side="top"
            align="start"
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                title={userEmail}
                aria-label="Account menu"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-raised text-xs font-semibold uppercase text-ink"
              >
                {(userName || userEmail || '?').slice(0, 1)}
              </button>
            )}
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium">{userName || 'Account'}</p>
              <p className="truncate text-xs text-muted">{userEmail}</p>
            </div>
            <div className="my-1 border-t border-line" />
            <Link
              href="/settings"
              className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-surface"
            >
              Settings
            </Link>
            {process.env.NEXT_PUBLIC_CONSOLE_URL && (
              <a
                href={process.env.NEXT_PUBLIC_CONSOLE_URL}
                className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-surface"
              >
                MindLarp Console ↗
              </a>
            )}
            {process.env.NEXT_PUBLIC_MAIN_SITE_URL && (
              <a
                href={process.env.NEXT_PUBLIC_MAIN_SITE_URL}
                className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-surface"
              >
                mindlarp.com ↗
              </a>
            )}
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-sm text-danger hover:bg-surface"
              >
                Sign out
              </button>
            </form>
          </Popover>
        </div>
      </nav>

      {/* Conversation sidebar (desktop) */}
      {isChatArea && (
        <aside className="hidden w-72 shrink-0 border-r border-line bg-surface md:block">
          <ConversationSidebar conversations={conversations} projects={projects} />
        </aside>
      )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-80 max-w-[85vw] border-r border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="font-display text-lg">MindLarp Chat</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-raised"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)] overflow-y-auto">
              <ConversationSidebar
                conversations={conversations}
                projects={projects}
                onNavigate={() => setDrawerOpen(false)}
              />
              <div className="border-t border-line p-3">
                {NAV.filter((item) => item.href !== '/chat').map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-ink hover:bg-raised"
                  >
                    <item.icon size={15} /> {item.label}
                  </Link>
                ))}
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="mt-1 w-full cursor-pointer rounded-md px-2 py-2 text-left text-sm text-danger hover:bg-raised"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="flex-1 cursor-default bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-raised"
          >
            <Menu size={18} />
          </button>
          <Link href="/chat" className="font-display text-lg">
            MindLarp Chat
          </Link>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
