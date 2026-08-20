import React from 'react';
import type { Severity } from '@/lib/mockData';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

const labels: Record<Severity, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const base = size === 'sm' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  const colorMap: Record<Severity, string> = {
    high: 'bg-severity-high text-severity-high border border-severity-high',
    medium: 'bg-severity-medium text-severity-medium border border-severity-medium',
    low: 'bg-severity-low text-severity-low border border-severity-low',
  };
  return (
    <span className={`inline-flex items-center font-mono font-semibold rounded-sm ${base} ${colorMap[severity]}`}>
      {labels[severity]}
    </span>
  );
}