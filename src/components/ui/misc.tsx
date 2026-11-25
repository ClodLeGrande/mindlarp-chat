import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent',
        className,
      )}
    />
  );
}

/** Three stepping squares — the agent-mode activity indicator. */
export function AgentSteps({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Agent working"
      className={cn('agent-steps inline-flex items-end gap-[3px] text-accent', className)}
    >
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
      <h2 className="font-display text-3xl text-ink">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'danger';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-medium',
        tone === 'accent' && 'border-accent/30 bg-accent-soft text-accent',
        tone === 'neutral' && 'border-line bg-surface text-muted',
        tone === 'danger' && 'border-danger/30 text-danger',
        className,
      )}
    >
      {children}
    </span>
  );
}
