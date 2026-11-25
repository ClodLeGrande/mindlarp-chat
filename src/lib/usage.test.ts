import { describe, expect, it } from 'vitest';

import type { UsageEvent } from './types';
import { dailySeries, summarizeUsage, usageByModel } from './usage';

function event(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: 1,
    user_id: 'u1',
    conversation_id: 'c1',
    provider: 'openai',
    model: 'gpt-5.2',
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
    latency_ms: 1000,
    agent_mode: false,
    skills: [],
    status: 'ok',
    created_at: '2026-11-25T10:00:00.000Z',
    ...partial,
  };
}

describe('summarizeUsage', () => {
  it('returns zeroes for empty input', () => {
    const totals = summarizeUsage([]);
    expect(totals.requests).toBe(0);
    expect(totals.totalTokens).toBe(0);
    expect(totals.avgLatencyMs).toBe(0);
  });

  it('aggregates tokens, models and latency', () => {
    const totals = summarizeUsage([
      event({}),
      event({ model: 'claude-sonnet-4-5', provider: 'anthropic', latency_ms: 3000 }),
    ]);
    expect(totals.requests).toBe(2);
    expect(totals.totalTokens).toBe(60);
    expect(totals.modelsUsed).toBe(2);
    expect(totals.avgLatencyMs).toBe(2000);
  });
});

describe('dailySeries', () => {
  const now = new Date(2026, 10, 25, 12, 0, 0);

  it('produces a continuous series ending today', () => {
    const series = dailySeries([], 7, now);
    expect(series).toHaveLength(7);
    expect(series[6].day).toBe('2026-11-25');
    expect(series.every((point) => point.totalTokens === 0)).toBe(true);
  });

  it('buckets events by day and ignores out-of-range events', () => {
    const series = dailySeries(
      [
        event({ created_at: '2026-11-25T08:00:00.000Z' }),
        event({ created_at: '2026-11-25T09:00:00.000Z', total_tokens: 5 }),
        event({ created_at: '2026-11-01T09:00:00.000Z' }),
      ],
      7,
      now,
    );
    const today = series[6];
    expect(today.requests).toBe(2);
    expect(today.totalTokens).toBe(35);
  });
});

describe('usageByModel', () => {
  it('groups by provider+model and sorts by tokens', () => {
    const rows = usageByModel([event({}), event({}), event({ model: 'small', total_tokens: 5 })]);
    expect(rows[0].model).toBe('gpt-5.2');
    expect(rows[0].requests).toBe(2);
    expect(rows[0].totalTokens).toBe(60);
    expect(rows[1].model).toBe('small');
  });
});
