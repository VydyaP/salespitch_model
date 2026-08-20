'use client';
import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface GapDistributionChartProps {
  high: number;
  medium: number;
  low: number;
}

export default function GapDistributionChart({ high, medium, low }: GapDistributionChartProps) {
  const total = high + medium + low;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground font-mono">
        No gaps to display
      </div>
    );
  }

  const data = [
    { name: 'Low', value: low, fill: 'var(--severity-low)' },
    { name: 'Medium', value: medium, fill: 'var(--severity-medium)' },
    { name: 'High', value: high, fill: 'var(--severity-high)' },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="30%"
          outerRadius="90%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={2}
            background={{ fill: 'var(--muted)' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md">
                  <p className="text-xs font-mono font-semibold text-foreground">
                    {d.name}: {d.value} gap{d.value !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        {[
          { id: 'leg-high', label: 'High', value: high, color: 'var(--severity-high)' },
          { id: 'leg-med', label: 'Med', value: medium, color: 'var(--severity-medium)' },
          { id: 'leg-low', label: 'Low', value: low, color: 'var(--severity-low)' },
        ].map((item) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-2xs font-mono text-muted-foreground">
              {item.label} {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}