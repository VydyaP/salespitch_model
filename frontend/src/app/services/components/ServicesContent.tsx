'use client';
import React from 'react';
import Link from 'next/link';
import { Thermometer, Warehouse, MapPin, Cpu, LayoutDashboard, ChevronRight } from 'lucide-react';
import { GND_SERVICES, type GNDService, type Company } from '@/lib/mockData';
import ServiceBadge from '@/components/ui/ServiceBadge';

const SERVICE_INFO: Record<GNDService, { icon: typeof Thermometer; description: string }> = {
  'Cold Chain Management': {
    icon: Thermometer,
    description: 'Real-time temperature monitoring, deviation alerts, and automated compliance reporting for temperature-sensitive goods.',
  },
  'Warehouse Management': {
    icon: Warehouse,
    description: 'WMS with sensor integration — surfaces inventory, environmental, and dwell-time data that inventory-only systems miss.',
  },
  'Asset Tracking & Monitoring': {
    icon: MapPin,
    description: 'Fleet and equipment telematics — location, utilisation, and condition tracking for reefer vehicles and deployed units.',
  },
  'Product Engineering': {
    icon: Cpu,
    description: 'Custom IoT hardware development — sensor nodes and embedded systems for cold-chain packaging and infrastructure.',
  },
  'Platform': {
    icon: LayoutDashboard,
    description: 'API, dashboards, and data integration — turns internal sensor data into client-facing, auditable records.',
  },
};

export default function ServicesContent({ companies }: { companies: Company[] }) {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <span className="section-label text-2xs">GND Solutions · Sales Intelligence</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">GND Service Lines</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every gap identified during research is mapped to one of these five service lines — this is the fixed
            vocabulary Stage 2 reasoning is constrained to when it tags a gap.
          </p>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GND_SERVICES.map((service) => {
            const info = SERVICE_INFO[service];
            const Icon = info.icon;
            const matches = companies.filter((c) => c.gaps.some((g) => g.gnd_service === service));
            const gapCount = companies.reduce(
              (acc, c) => acc + c.gaps.filter((g) => g.gnd_service === service).length,
              0
            );

            return (
              <div key={service} className="kraft-card p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-foreground">{service}</h2>
                      <ServiceBadge service={service} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{info.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-border">
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-foreground">{gapCount}</span>
                    <span className="text-2xs text-muted-foreground font-mono uppercase tracking-wide ml-1.5">
                      gap{gapCount !== 1 ? 's' : ''} identified
                    </span>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-foreground">{matches.length}</span>
                    <span className="text-2xs text-muted-foreground font-mono uppercase tracking-wide ml-1.5">
                      companies affected
                    </span>
                  </div>
                </div>

                {matches.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    {matches.slice(0, 3).map((co) => (
                      <Link
                        key={`${service}-${co.id}`}
                        href={`/company-report?id=${co.id}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
                      >
                        <span className="truncate flex-1">{co.company_name}</span>
                        <ChevronRight size={12} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </Link>
                    ))}
                    {matches.length > 3 && (
                      <p className="text-2xs text-muted-foreground font-mono">+{matches.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-2xs text-muted-foreground font-mono mt-6">
          Service lines are currently fixed — editing or adding new lines here would also require updating the
          Stage 2 reasoning prompt on the backend so it can actually tag gaps against the new set.
        </p>
      </div>
    </div>
  );
}
