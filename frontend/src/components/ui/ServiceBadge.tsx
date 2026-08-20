import React from 'react';
import type { GNDService } from '@/lib/mockData';

interface ServiceBadgeProps {
  service: GNDService;
  size?: 'sm' | 'md';
}

const shortLabels: Record<GNDService, string> = {
  'Cold Chain Management': 'ThinxFresh',
  'Warehouse Management': 'WMS',
  'Asset Tracking & Monitoring': 'Asset Track',
  'Product Engineering': 'Prod Eng',
  'Platform': 'Platform',
};

const colorMap: Record<GNDService, string> = {
  'Cold Chain Management': 'service-cold',
  'Warehouse Management': 'service-warehouse',
  'Asset Tracking & Monitoring': 'service-asset',
  'Product Engineering': 'service-engineering',
  'Platform': 'service-platform',
};

export default function ServiceBadge({ service, size = 'md' }: ServiceBadgeProps) {
  const base = size === 'sm' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center font-mono font-medium rounded-sm ${base} ${colorMap[service]}`}>
      {shortLabels[service]}
    </span>
  );
}