'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Phone,
  Calendar,
  MapPin,
  Building2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Download,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getSeverityCounts,
  getServiceLines,
  formatResearchDateTime,
  type Company,
  type Gap,
  type Fact,
} from '@/lib/mockData';
import { discardCompany } from '@/lib/api';
import SeverityBadge from '@/components/ui/SeverityBadge';
import ServiceBadge from '@/components/ui/ServiceBadge';
import VerificationBadge from '@/components/ui/VerificationBadge';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const GapDistributionChart = dynamic(
  () => import('./GapDistributionChart'),
  { ssr: false }
);

export default function CompanyReportContent({
  company,
  companies,
}: {
  company: Company | undefined;
  companies: Company[];
}) {
  const router = useRouter();
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());
  const [expandedFacts, setExpandedFacts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!company) return;
    const confirmed = window.confirm(
      `Delete "${company.company_name}" permanently?\n\nThis removes its research from disk -- it cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await discardCompany(company.id);
      toast.success(`"${company.company_name}" deleted`);
      router.push('/');
    } catch {
      toast.error('Delete failed.');
      setIsDeleting(false);
    }
  }
  const [activeTab, setActiveTab] = useState<'gaps' | 'facts' | 'pitch'>('gaps');

  if (!company) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <Building2 size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <h1 className="text-base font-semibold text-foreground mb-1">Company not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This prospect hasn&apos;t been researched yet, or the link is out of date.
          </p>
          <Link href="/" className="btn-primary text-sm">
            <ArrowLeft size={15} />
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const sevCounts = getSeverityCounts(company);
  const serviceLines = getServiceLines(company);
  const highGaps = company.gaps.filter((g) => g.severity === 'high');
  const mediumGaps = company.gaps.filter((g) => g.severity === 'medium');
  const lowGaps = company.gaps.filter((g) => g.severity === 'low');

  function toggleGap(id: string) {
    setExpandedGaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFact(id: string) {
    setExpandedFacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getFactById(factId: string): Fact | undefined {
    return company!.facts.find((f) => f.id === factId);
  }

  return (
    <div className="min-h-full bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm px-6 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="btn-ghost text-xs py-1 px-2 flex-shrink-0">
              <ArrowLeft size={14} />
              Directory
            </Link>
            <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{company.company_name}</span>
            {sevCounts.high > 0 && (
              <span className="flex items-center gap-1 text-2xs font-mono font-semibold bg-severity-high text-severity-high border border-severity-high px-1.5 py-0.5 rounded-sm flex-shrink-0">
                <AlertTriangle size={10} />
                {sevCounts.high} HIGH
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="btn-ghost text-xs py-1.5 px-2.5">
              <Download size={14} />
              Export
            </button>
            <button className="btn-ghost text-xs py-1.5 px-2.5">
              <Share2 size={14} />
              Share
            </button>
            <Link
              href={`/live-research-flow?q=${encodeURIComponent(company.company_name)}&rescan=1`}
              className="btn-secondary text-xs py-1.5 px-2.5"
            >
              <RefreshCw size={14} />
              Re-research
            </Link>
            <button
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="btn-ghost text-xs py-1.5 px-2.5 !text-severity-high disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Company overview — compact, above fold */}
        <div className="kraft-card p-5 mb-4">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            {/* Identity column */}
            <div className="xl:col-span-3 flex items-start gap-4">
              <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Building2 size={22} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-foreground leading-tight">{company.company_name}</h1>
                  <span className="text-2xs font-mono font-semibold text-primary/60 border border-primary/20 px-1.5 py-0.5 rounded-sm flex-shrink-0 mt-0.5">
                    ON FILE
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{company.industry}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {company.hq}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Est. {company.founded}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 size={12} />
                    {company.size}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2.5">
                  {company.website && company.website !== 'Unknown' && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe size={13} />
                      Website
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {company.linkedin_url && company.linkedin_url !== 'Unknown' && (
                    <a
                      href={company.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                      LinkedIn
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {company.phone && company.phone !== 'Unknown' && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Phone size={13} />
                      {company.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats column */}
            <div className="xl:col-span-2 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'stat-high',
                    label: 'High',
                    value: sevCounts.high,
                    color: sevCounts.high > 0 ? 'text-severity-high' : 'text-muted-foreground',
                    bg: sevCounts.high > 0 ? 'bg-severity-high border-severity-high' : 'bg-muted/50 border-border',
                  },
                  {
                    id: 'stat-med',
                    label: 'Medium',
                    value: sevCounts.medium,
                    color: sevCounts.medium > 0 ? 'text-severity-medium' : 'text-muted-foreground',
                    bg: sevCounts.medium > 0 ? 'bg-severity-medium border-severity-medium' : 'bg-muted/50 border-border',
                  },
                  {
                    id: 'stat-low',
                    label: 'Low',
                    value: sevCounts.low,
                    color: sevCounts.low > 0 ? 'text-severity-low' : 'text-muted-foreground',
                    bg: sevCounts.low > 0 ? 'bg-severity-low border-severity-low' : 'bg-muted/50 border-border',
                  },
                ].map((stat) => (
                  <div key={stat.id} className={`rounded border p-2 text-center ${stat.bg}`}>
                    <p className={`text-2xl font-bold font-mono tabular-nums ${stat.color}`}>{stat.value}</p>
                    <p className={`text-2xs font-mono font-semibold uppercase tracking-wide ${stat.color}`}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <span className="section-label text-2xs block mb-1.5">Service Lines Mapped</span>
                <div className="flex flex-wrap gap-1.5">
                  {serviceLines.map((svc) => (
                    <ServiceBadge key={`header-svc-${svc}`} service={svc} size="sm" />
                  ))}
                </div>
              </div>

              <div className="text-2xs text-muted-foreground font-mono">
                Researched {formatResearchDateTime(company.researched_at)} · {company.facts.length} sourced facts
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid — gaps prominent, near-zero scroll */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* LEFT: Gaps (2/3 width) — the primary pre-call read */}
          <div className="xl:col-span-2 space-y-4">
            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b border-border">
              {[
                { id: 'tab-gaps', key: 'gaps' as const, label: `Gaps (${company.gaps.length})` },
                { id: 'tab-facts', key: 'facts' as const, label: `Sourced Facts (${company.facts.length})` },
                { id: 'tab-pitch', key: 'pitch' as const, label: 'Pitch' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150 -mb-px ${
                    activeTab === tab.key
                      ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* GAPS TAB */}
            {activeTab === 'gaps' && (
              <div className="space-y-3 animate-fade-in">
                {company.gaps.length === 0 ? (
                  <div className="kraft-card p-8 text-center">
                    <AlertTriangle size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold text-foreground">No gaps identified</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This company may already have strong cold-chain infrastructure, or insufficient public data was found.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* High severity first */}
                    {highGaps.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-severity-high" />
                          <span className="section-label text-2xs text-severity-high">High Severity</span>
                        </div>
                        <div className="space-y-2">
                          {highGaps.map((gap) => (
                            <GapCard
                              key={`gap-${gap.id}`}
                              gap={gap}
                              fact={getFactById(gap.based_on_fact_id)}
                              expanded={expandedGaps.has(gap.id)}
                              onToggle={() => toggleGap(gap.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {mediumGaps.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="section-label text-2xs text-severity-medium">Medium Severity</span>
                        </div>
                        <div className="space-y-2">
                          {mediumGaps.map((gap) => (
                            <GapCard
                              key={`gap-${gap.id}`}
                              gap={gap}
                              fact={getFactById(gap.based_on_fact_id)}
                              expanded={expandedGaps.has(gap.id)}
                              onToggle={() => toggleGap(gap.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {lowGaps.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="section-label text-2xs text-severity-low">Low Severity</span>
                        </div>
                        <div className="space-y-2">
                          {lowGaps.map((gap) => (
                            <GapCard
                              key={`gap-${gap.id}`}
                              gap={gap}
                              fact={getFactById(gap.based_on_fact_id)}
                              expanded={expandedGaps.has(gap.id)}
                              onToggle={() => toggleGap(gap.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FACTS TAB */}
            {activeTab === 'facts' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-xs text-muted-foreground font-mono">
                  Every claim below is hyperlinked to its source. Click the claim text to open the source URL in a new tab.
                </p>
                {company.facts.map((fact, idx) => (
                  <FactCard
                    key={`fact-${fact.id}`}
                    fact={fact}
                    index={idx + 1}
                    expanded={expandedFacts.has(fact.id)}
                    onToggle={() => toggleFact(fact.id)}
                  />
                ))}
              </div>
            )}

            {/* PITCH TAB */}
            {activeTab === 'pitch' && (
              <div className="space-y-4 animate-fade-in">
                <PitchCard pitch={company.pitch} />
              </div>
            )}
          </div>

          {/* RIGHT: Chart + quick facts */}
          <div className="xl:col-span-1 space-y-4">
            {/* Gap distribution chart */}
            <div className="kraft-card p-4">
              <span className="section-label text-2xs block mb-3">Gap Distribution</span>
              <GapDistributionChart
                high={sevCounts.high}
                medium={sevCounts.medium}
                low={sevCounts.low}
              />
            </div>

            {/* Quick company facts */}
            <div className="kraft-card p-4">
              <span className="section-label text-2xs block mb-3">Company Snapshot</span>
              <div className="space-y-2.5">
                {[
                  { id: 'snap-founded', label: 'Founded', value: company.founded },
                  { id: 'snap-hq', label: 'HQ', value: company.hq },
                  { id: 'snap-size', label: 'Size', value: company.size },
                  { id: 'snap-phone', label: 'Phone', value: company.phone },
                  { id: 'snap-researched', label: 'Researched', value: formatResearchDateTime(company.researched_at) },
                  { id: 'snap-facts', label: 'Facts on file', value: `${company.facts.length} sourced` },
                  { id: 'snap-gaps', label: 'Total gaps', value: `${company.gaps.length} identified` },
                ].map((row) => (
                  <div key={row.id} className="flex items-start gap-2">
                    <span className="text-2xs font-mono font-semibold text-muted-foreground uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">
                      {row.label}
                    </span>
                    <span className="text-xs text-foreground font-mono leading-snug">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service lines detail */}
            <div className="kraft-card p-4">
              <span className="section-label text-2xs block mb-3">GND Coverage</span>
              <div className="space-y-2">
                {serviceLines.map((svc) => {
                  const count = company.gaps.filter((g) => g.gnd_service === svc).length;
                  return (
                    <div key={`coverage-${svc}`} className="flex items-center gap-2">
                      <ServiceBadge service={svc} size="sm" />
                      <span className="text-2xs text-muted-foreground font-mono flex-1">
                        {count} gap{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other companies nav */}
            <div className="kraft-card p-4">
              <span className="section-label text-2xs block mb-3">Other Prospects</span>
              <div className="space-y-1">
                {companies
                  .filter((c) => c.id !== company.id)
                  .slice(0, 5)
                  .map((co) => {
                    const sc = getSeverityCounts(co);
                    return (
                      <Link
                        key={`other-${co.id}`}
                        href={`/company-report?id=${co.id}`}
                        className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-secondary transition-colors group"
                      >
                        <Building2 size={12} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-foreground truncate flex-1 group-hover:text-primary transition-colors">
                          {co.company_name}
                        </span>
                        {sc.high > 0 && (
                          <span className="text-2xs font-mono font-semibold text-severity-high flex-shrink-0">
                            {sc.high}H
                          </span>
                        )}
                        <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                      </Link>
                    );
                  })}
                <Link
                  href="/"
                  className="flex items-center gap-1.5 text-xs text-primary font-medium mt-2 hover:gap-2 transition-all"
                >
                  View all {companies.length} companies
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gap Card ──────────────────────────────────────────────────────────────────

function GapCard({
  gap,
  fact,
  expanded,
  onToggle,
}: {
  gap: Gap;
  fact: Fact | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  const borderColor =
    gap.severity === 'high' ?'border-l-severity-high'
      : gap.severity === 'medium' ?'border-l-severity-medium' :'border-l-severity-low';

  const borderWidth =
    gap.severity === 'high' ? 'border-l-4' : gap.severity === 'medium' ? 'border-l-[3px]' : 'border-l-2';

  return (
    <div
      className={`kraft-card ${borderWidth} ${borderColor} overflow-hidden transition-all duration-200`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">
          <SeverityBadge severity={gap.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{gap.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <ServiceBadge service={gap.gnd_service} size="sm" />
            {gap.verification_status && <VerificationBadge status={gap.verification_status} />}
            {fact && (
              <span className="text-2xs text-muted-foreground font-mono">
                Based on: fact #{fact.id.split('-').pop()}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border animate-slide-up">
          <p className="text-sm text-foreground leading-relaxed mt-3 mb-4">{gap.detail}</p>

          {fact && (
            <div className="bg-background border border-border rounded p-3">
              <span className="section-label text-2xs block mb-2">Grounded in this fact</span>
              <a
                href={fact.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-accent underline underline-offset-2 leading-snug block mb-2 transition-colors"
              >
                {fact.claim}
                <ExternalLink size={11} className="inline ml-1 mb-0.5" />
              </a>
              <div className="bg-secondary/50 rounded p-2.5 border-l-2 border-muted-foreground/30">
                <p className="text-xs text-muted-foreground font-mono italic leading-relaxed">
                  &ldquo;{fact.source_snippet}&rdquo;
                </p>
                <a
                  href={fact.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xs text-muted-foreground hover:text-primary font-mono mt-1.5 block truncate transition-colors"
                >
                  {fact.source_url}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fact Card ─────────────────────────────────────────────────────────────────

function FactCard({
  fact,
  index,
  expanded,
  onToggle,
}: {
  fact: Fact;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="kraft-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs font-bold text-primary/50 w-5 flex-shrink-0 mt-0.5">
            {String(index).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0">
            {/* Claim text IS the hyperlink */}
            <a
              href={fact.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:text-accent underline underline-offset-2 leading-snug block transition-colors"
            >
              {fact.claim}
              <ExternalLink size={11} className="inline ml-1 mb-0.5" />
            </a>
            <button
              onClick={onToggle}
              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} />
                  Hide source snippet
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  Show source snippet
                </>
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 ml-8 animate-slide-up">
            <div className="bg-secondary/50 rounded p-3 border-l-2 border-muted-foreground/30">
              <p className="text-xs text-muted-foreground font-mono italic leading-relaxed">
                &ldquo;{fact.source_snippet}&rdquo;
              </p>
            </div>
            <a
              href={fact.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-2xs text-muted-foreground hover:text-primary font-mono mt-2 transition-colors"
            >
              <Globe size={11} />
              <span className="truncate">{fact.source_url}</span>
              <ExternalLink size={10} className="flex-shrink-0" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pitch Card ────────────────────────────────────────────────────────────────

// Bolds the numbers/stats and GND product names inside a pitch line so the
// concrete hooks (bed counts, %, ₹ figures, "ThinxFresh") pop out at a glance
// on a call, without needing to hand-tag every company's data.
const HIGHLIGHT_PATTERN =
  /(ThinxFresh|₹\s?\d[\d,]*\.?\d*(?:\s?(?:crore|lakh))?|\d[\d,]*\.?\d*%|\b\d[\d,]{1,}\+?\b)/g;

function highlightPoint(text: string) {
  return text.split(HIGHLIGHT_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-primary font-semibold">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function PitchCard({ pitch }: { pitch: { angle: string; opener: string } }) {
  // Newer analyses write the angle as newline-separated pointed
  // statements ("- ..."); older companies still have one flowing
  // paragraph. Render as bullets when there's more than one line,
  // otherwise fall back to the plain paragraph so nothing looks broken
  // for companies analyzed before this format existed.
  const points = pitch.angle
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);

  return (
    <div className="kraft-card p-5">
      <span className="section-label text-2xs block mb-4">Pitch Angle</span>
      {points.length > 1 ? (
        <ul className="space-y-3">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-2xs font-bold mt-0.5 flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-foreground leading-relaxed">{highlightPoint(point)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground leading-relaxed">{highlightPoint(pitch.angle)}</p>
      )}
    </div>
  );
}
