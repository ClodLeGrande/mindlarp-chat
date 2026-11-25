import type { UsageEvent } from '@/lib/types';

export interface UsageTotals {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelsUsed: number;
  avgLatencyMs: number;
}

export function summarizeUsage(events: UsageEvent[]): UsageTotals {
  const models = new Set<string>();
  let promptTokens = 0;
  let completionTokens = 0;
  let latencySum = 0;

  for (const event of events) {
    models.add(event.model);
    promptTokens += event.prompt_tokens;
    completionTokens += event.completion_tokens;
    latencySum += event.latency_ms;
  }

  return {
    requests: events.length,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    modelsUsed: models.size,
    avgLatencyMs: events.length > 0 ? Math.round(latencySum / events.length) : 0,
  };
}

export interface DailyPoint {
  day: string;
  label: string;
  totalTokens: number;
  requests: number;
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Continuous daily series ending today, bucketed in local time. */
export function dailySeries(events: UsageEvent[], days = 14, now = new Date()): DailyPoint[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const points: DailyPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      startOfToday.getDate() - offset,
    );
    points.push({
      day: localDay(date),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalTokens: 0,
      requests: 0,
    });
  }

  const byDay = new Map(points.map((point) => [point.day, point]));
  for (const event of events) {
    const point = byDay.get(localDay(new Date(event.created_at)));
    if (point) {
      point.totalTokens += event.total_tokens;
      point.requests += 1;
    }
  }

  return points;
}

export interface ModelUsage {
  model: string;
  provider: string;
  requests: number;
  totalTokens: number;
}

export function usageByModel(events: UsageEvent[]): ModelUsage[] {
  const map = new Map<string, ModelUsage>();
  for (const event of events) {
    const key = `${event.provider}:${event.model}`;
    const entry = map.get(key) ?? {
      model: event.model,
      provider: event.provider,
      requests: 0,
      totalTokens: 0,
    };
    entry.requests += 1;
    entry.totalTokens += event.total_tokens;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.totalTokens - a.totalTokens);
}
