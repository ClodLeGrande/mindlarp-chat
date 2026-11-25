import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { UsageChart } from '@/components/usage/usage-chart';
import { EmptyState } from '@/components/ui/misc';
import { createClient } from '@/lib/supabase/server';
import type { UsageEvent } from '@/lib/types';
import { dailySeries, summarizeUsage, usageByModel } from '@/lib/usage';
import { formatCompact, formatNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Usage' };

export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: events } = await supabase
    .schema('chat')
    .from('usage_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);

  const rows = (events ?? []) as UsageEvent[];
  const totals = summarizeUsage(rows);
  const series = dailySeries(rows);
  const models = usageByModel(rows);
  const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;

  const cards = [
    { label: 'Requests', value: formatNumber(totals.requests) },
    { label: 'Tokens', value: formatCompact(totals.totalTokens) },
    { label: 'Models used', value: String(totals.modelsUsed) },
    {
      label: 'Avg latency',
      value: totals.avgLatencyMs > 0 ? `${(totals.avgLatencyMs / 1000).toFixed(1)}s` : '—',
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        <header className="mb-8">
          <p className="label mb-2">Statistics</p>
          <h1 className="font-display text-4xl">Usage</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Every request is logged to the shared MindLarp Supabase project, so the console and the
            main site see the same numbers.
            {consoleUrl && (
              <>
                {' '}
                <a href={consoleUrl} className="text-accent hover:underline">
                  Open console ↗
                </a>
              </>
            )}
          </p>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="No usage yet"
            description="Send your first message and the statistics will appear here."
          />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="rounded-lg border border-line bg-raised p-4">
                  <p className="label mb-2">{card.label}</p>
                  <p className="font-display text-3xl tabular-nums">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <UsageChart points={series} />
            </div>

            <section>
              <h2 className="label mb-3">By model</h2>
              <div className="overflow-x-auto rounded-lg border border-line bg-raised">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="px-4 py-2.5 font-medium">Model</th>
                      <th className="px-4 py-2.5 font-medium">Provider</th>
                      <th className="px-4 py-2.5 text-right font-medium">Requests</th>
                      <th className="px-4 py-2.5 text-right font-medium">Tokens</th>
                      <th className="w-32 px-4 py-2.5 font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((entry) => {
                      const share =
                        totals.totalTokens > 0 ? entry.totalTokens / totals.totalTokens : 0;
                      return (
                        <tr
                          key={`${entry.provider}:${entry.model}`}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs">{entry.model}</td>
                          <td className="px-4 py-2.5 text-muted">{entry.provider}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatNumber(entry.requests)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatCompact(entry.totalTokens)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="h-1.5 w-full rounded-full bg-surface">
                              <div
                                className="h-1.5 rounded-full bg-accent"
                                style={{ width: `${Math.max(share * 100, 2)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
