import type { DailyPoint } from '@/lib/usage';
import { formatCompact } from '@/lib/utils';

/**
 * Single-series daily token bars (trend). One accent color, subtle gridlines,
 * direct day labels — no legend needed for a single series.
 */
export function UsageChart({ points }: { points: DailyPoint[] }) {
  const width = 720;
  const height = 180;
  const padding = { top: 12, right: 8, bottom: 26, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(...points.map((point) => point.totalTokens), 1);
  const barWidth = (plotWidth / points.length) * 0.62;
  const step = plotWidth / points.length;

  const gridValues = [0.5, 1].map((fraction) => Math.round(max * fraction));

  return (
    <figure className="rounded-lg border border-line bg-raised p-4">
      <figcaption className="mb-1 text-sm font-medium">
        Daily token usage — last {points.length} days
      </figcaption>
      <p className="mb-3 text-xs text-muted">
        {formatCompact(points.reduce((sum, point) => sum + point.totalTokens, 0))} tokens total
        across {points.reduce((sum, point) => sum + point.requests, 0)} requests
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Bar chart of daily token usage over the last ${points.length} days`}
          className="w-full min-w-105"
        >
          {gridValues.map((value) => {
            const y = padding.top + plotHeight - (value / max) * plotHeight;
            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {formatCompact(value)}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotHeight}
            y2={padding.top + plotHeight}
            stroke="var(--line)"
            strokeWidth={1}
          />
          {points.map((point, index) => {
            const barHeight = (point.totalTokens / max) * plotHeight;
            const x = padding.left + index * step + (step - barWidth) / 2;
            const y = padding.top + plotHeight - barHeight;
            return (
              <g key={point.day}>
                <rect
                  x={x}
                  y={point.totalTokens > 0 ? y : padding.top + plotHeight - 1}
                  width={barWidth}
                  height={point.totalTokens > 0 ? Math.max(barHeight, 2) : 1}
                  rx={2}
                  fill={point.totalTokens > 0 ? 'var(--accent)' : 'var(--line)'}
                >
                  <title>{`${point.label}: ${point.totalTokens.toLocaleString('en-US')} tokens, ${point.requests} requests`}</title>
                </rect>
                {index % 2 === 0 && (
                  <text
                    x={padding.left + index * step + step / 2}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--muted)"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
