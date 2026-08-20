'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Building2, MapPin, Calendar, ChevronRight, X, AlertTriangle, Globe, ArrowUpRight, SlidersHorizontal, LayoutGrid, List, Trash2, Check } from 'lucide-react';
import { getSeverityCounts, getServiceLines, formatResearchDate, type Company, type Severity, type GNDService } from '@/lib/mockData';
import { discardCompany } from '@/lib/api';
import SeverityBadge from '@/components/ui/SeverityBadge';
import ServiceBadge from '@/components/ui/ServiceBadge';
import { toast } from 'sonner';

const INDUSTRY_FILTERS = [
  { id: 'filter-all-industry', label: 'All Industries', value: '' },
  { id: 'filter-cold', label: 'Cold Storage', value: 'cold storage' },
  { id: 'filter-logistics', label: 'Logistics & Freight', value: 'logistics' },
  { id: 'filter-pharma', label: 'Pharma Distribution', value: 'pharma' },
  { id: 'filter-transport', label: 'Transport Refrigeration', value: 'transport refrigeration' },
];

const SEVERITY_FILTERS: { id: string; label: string; value: Severity | '' }[] = [
  { id: 'sev-all', label: 'Any Severity', value: '' },
  { id: 'sev-high', label: 'Has High Gap', value: 'high' },
  { id: 'sev-medium', label: 'Has Medium Gap', value: 'medium' },
  { id: 'sev-low', label: 'Low Only', value: 'low' },
];

const SERVICE_FILTERS: { id: string; label: string; value: GNDService | '' }[] = [
  { id: 'svc-all', label: 'All Service Lines', value: '' },
  { id: 'svc-cold', label: 'Cold Chain (ThinxFresh)', value: 'Cold Chain Management' },
  { id: 'svc-wms', label: 'Warehouse Mgmt', value: 'Warehouse Management' },
  { id: 'svc-asset', label: 'Asset Tracking', value: 'Asset Tracking & Monitoring' },
  { id: 'svc-eng', label: 'Product Engineering', value: 'Product Engineering' },
  { id: 'svc-platform', label: 'Platform', value: 'Platform' },
];

export default function DirectoryContent({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [industryFilter, setIndustryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [serviceFilter, setServiceFilter] = useState<GNDService | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'gaps'>('date');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const names = companies.filter((c) => selectedIds.has(c.id)).map((c) => c.company_name);
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} compan${selectedIds.size === 1 ? 'y' : 'ies'} permanently?\n\n${names.join('\n')}\n\nThis removes their research from disk -- it cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => discardCompany(id)));
      toast.success(`Deleted ${selectedIds.size} compan${selectedIds.size === 1 ? 'y' : 'ies'}`);
      setSelectedIds(new Set());
      setSelectMode(false);
      router.refresh();
    } catch {
      toast.error('Delete failed for one or more companies.');
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return companies
      .filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.hq.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, companies]);

  const filteredCompanies = useMemo(() => {
    let list = [...companies];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.hq.toLowerCase().includes(q)
      );
    }

    if (industryFilter) {
      list = list.filter((c) => c.industry.toLowerCase().includes(industryFilter.toLowerCase()));
    }

    if (severityFilter) {
      list = list.filter((c) => c.gaps.some((g) => g.severity === severityFilter));
    }

    if (serviceFilter) {
      list = list.filter((c) => c.gaps.some((g) => g.gnd_service === serviceFilter));
    }

    list.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.researched_at).getTime() - new Date(a.researched_at).getTime();
      }
      if (sortBy === 'name') {
        return a.company_name.localeCompare(b.company_name);
      }
      if (sortBy === 'gaps') {
        const aH = a.gaps.filter((g) => g.severity === 'high').length;
        const bH = b.gaps.filter((g) => g.severity === 'high').length;
        return bH - aH;
      }
      return 0;
    });

    return list;
  }, [companies, query, industryFilter, severityFilter, serviceFilter, sortBy]);

  const activeFilterCount = [industryFilter, severityFilter, serviceFilter].filter(Boolean).length;

  const totalHighGaps = companies.reduce(
    (acc, c) => acc + c.gaps.filter((g) => g.severity === 'high').length,
    0
  );

  const lastResearchDate = companies.length
    ? formatResearchDate(
        companies.reduce((latest, c) => (c.researched_at > latest ? c.researched_at : latest), companies[0].researched_at)
      )
    : '—';

  return (
    <div className="min-h-full bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="section-label text-2xs">GND Solutions · Sales Intelligence</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Company Directory
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {companies.length} researched prospects · {totalHighGaps} high-severity gaps identified
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/live-research-flow"
                className="btn-primary text-sm"
              >
                <Search size={15} />
                Research New Company
              </Link>
            </div>
          </div>

          {/* Summary stat row */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
            {[
              { id: 'stat-total', label: 'Total Researched', value: companies.length.toString() },
              {
                id: 'stat-high',
                label: 'High-Severity Gaps',
                value: totalHighGaps.toString(),
                accent: true,
              },
              {
                id: 'stat-services',
                label: 'Service Lines Mapped',
                value: '5',
              },
              {
                id: 'stat-recent',
                label: 'Last Research',
                value: lastResearchDate,
              },
            ].map((stat) => (
              <div key={stat.id} className="flex flex-col">
                <span className={`text-xl font-bold tabular-nums font-mono ${stat.accent ? 'text-severity-high' : 'text-foreground'}`}>
                  {stat.value}
                </span>
                <span className="text-2xs text-muted-foreground font-mono uppercase tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Search + filter bar */}
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xl" ref={searchRef}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by company name, industry, or location…"
              className="input-field pl-9 pr-4"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setShowSuggestions(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && query.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded shadow-lg z-50 overflow-hidden animate-fade-in">
                {suggestions.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 border-b border-border">
                      <span className="section-label text-2xs">Already Researched</span>
                    </div>
                    {suggestions.map((co) => (
                      <Link
                        key={`sug-${co.id}`}
                        href={`/company-report?id=${co.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors duration-100 group"
                      >
                        <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <Building2 size={13} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{co.company_name}</p>
                          <p className="text-2xs text-muted-foreground font-mono truncate">{co.industry} · {co.hq}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getSeverityCounts(co).high > 0 && (
                            <SeverityBadge severity="high" size="sm" />
                          )}
                          <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </>
                ) : null}
                {/* New search CTA */}
                <Link
                  href={`/live-research-flow?q=${encodeURIComponent(query)}`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-3 px-3 py-2.5 border-t border-border hover:bg-primary/5 transition-colors duration-100 group"
                >
                  <div className="w-7 h-7 rounded-sm bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Search size={13} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">
                      Research &quot;{query}&quot; →
                    </p>
                    <p className="text-2xs text-muted-foreground font-mono">New search — not yet in directory</p>
                  </div>
                  <ArrowUpRight size={14} className="text-primary flex-shrink-0" />
                </Link>
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex-shrink-0 relative ${showFilters ? 'border-primary text-primary' : ''}`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-2xs font-mono font-semibold bg-primary text-primary-foreground rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground font-mono">Sort:</span>
            {[
              { id: 'sort-date', label: 'Recent', value: 'date' as const },
              { id: 'sort-name', label: 'A–Z', value: 'name' as const },
              { id: 'sort-gaps', label: 'High Gaps', value: 'gaps' as const },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.value)}
                className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded transition-all duration-100 ${
                  sortBy === s.value
                    ? 'bg-primary/10 text-primary border border-primary/20' :'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 flex-shrink-0 border border-border rounded p-0.5">
            <button
              onClick={() => setViewMode('card')}
              title="Card view"
              className={`p-1.5 rounded-sm transition-all duration-100 ${
                viewMode === 'card' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-sm transition-all duration-100 ${
                viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List size={15} />
            </button>
          </div>

          {/* Delete mode toggle -- its own block, separate from view mode */}
          <div className="flex items-center flex-shrink-0 border border-border rounded p-0.5">
            <button
              onClick={toggleSelectMode}
              title={selectMode ? 'Cancel delete' : 'Select companies to delete'}
              className={`p-1.5 rounded-sm transition-all duration-100 ${
                selectMode ? 'text-severity-high' : 'text-muted-foreground hover:text-severity-high'
              }`}
              style={selectMode ? { backgroundColor: 'var(--severity-high-bg)' } : undefined}
            >
              <Trash2 size={15} />
            </button>
          </div>

          {selectMode && (
            <button
              onClick={() => void handleDeleteSelected()}
              disabled={selectedIds.size === 0 || isDeleting}
              className="btn-secondary text-xs flex-shrink-0 !text-severity-high disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--severity-high)' }}
            >
              <Trash2 size={13} />
              {isDeleting ? 'Deleting…' : `Delete ${selectedIds.size} selected`}
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-4 p-4 bg-card border border-border rounded animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="section-label text-2xs block mb-2">Industry</label>
                <div className="flex flex-wrap gap-1.5">
                  {INDUSTRY_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setIndustryFilter(f.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-100 border ${
                        industryFilter === f.value
                          ? 'bg-primary/10 text-primary border-primary/30' :'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="section-label text-2xs block mb-2">Gap Severity</label>
                <div className="flex flex-wrap gap-1.5">
                  {SEVERITY_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSeverityFilter(f.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-100 border ${
                        severityFilter === f.value
                          ? 'bg-primary/10 text-primary border-primary/30' :'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="section-label text-2xs block mb-2">GND Service Line</label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setServiceFilter(f.value as GNDService | '')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-100 border ${
                        serviceFilter === f.value
                          ? 'bg-primary/10 text-primary border-primary/30' :'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setIndustryFilter(''); setSeverityFilter(''); setServiceFilter(''); }}
                className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground font-mono">
            {filteredCompanies.length} of {companies.length} companies
            {activeFilterCount > 0 && ' · filtered'}
          </p>
        </div>

        {/* Company grid / list */}
        {filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 size={40} className="text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-base font-semibold text-foreground mb-1">
              {companies.length === 0 ? 'No companies researched yet' : 'No companies match your filters'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {companies.length === 0
                ? 'Research your first prospect to populate the directory.'
                : 'Try adjusting your search or filters, or research a new company.'}
            </p>
            <Link href="/live-research-flow" className="btn-primary text-sm">
              <Search size={15} />
              Research New Company
            </Link>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={`card-${company.id}`}
                company={company}
                selectMode={selectMode}
                selected={selectedIds.has(company.id)}
                onToggleSelect={() => toggleSelected(company.id)}
              />
            ))}
          </div>
        ) : (
          <div className="kraft-card divide-y divide-border overflow-hidden">
            {filteredCompanies.map((company) => (
              <CompanyListRow
                key={`row-${company.id}`}
                company={company}
                selectMode={selectMode}
                selected={selectedIds.has(company.id)}
                onToggleSelect={() => toggleSelected(company.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  company: Company;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const sevCounts = getSeverityCounts(company);
  const serviceLines = getServiceLines(company);
  const hasHighGap = sevCounts.high > 0;

  return (
    <Link
      href={`/company-report?id=${company.id}`}
      onClick={(e) => {
        if (selectMode) {
          e.preventDefault();
          onToggleSelect?.();
        }
      }}
      className={`kraft-card block p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 group relative overflow-hidden ${
        hasHighGap ? 'border-l-4 border-l-severity-high' : ''
      } ${selected ? 'border-severity-high' : ''}`}
      style={selected ? { boxShadow: '0 0 0 1px var(--severity-high)' } : undefined}
    >
      {/* Selection checkbox (delete mode) or the "RESEARCHED" stamp */}
      <div className="absolute top-3 right-3">
        {selectMode ? (
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-sm border-2 transition-colors ${
              selected ? 'border-severity-high' : 'border-border-strong bg-card'
            }`}
            style={selected ? { backgroundColor: 'var(--severity-high)' } : undefined}
          >
            {selected && <Check size={12} className="text-white" />}
          </span>
        ) : (
          <span className="text-2xs font-mono font-semibold text-primary/50 tracking-widest uppercase border border-primary/20 px-1.5 py-0.5 rounded-sm">
            ON FILE
          </span>
        )}
      </div>

      {/* Company header */}
      <div className="flex items-start gap-2.5 mb-3 pr-16">
        <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Building2 size={16} className="text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
            {company.company_name}
          </h3>
          <p className="text-2xs text-muted-foreground font-mono mt-0.5 truncate">
            Est. {company.founded}
          </p>
        </div>
      </div>

      {/* Industry */}
      <p className="text-xs text-muted-foreground leading-snug mb-3 line-clamp-2">
        {company.industry}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-3 text-2xs text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate max-w-[100px]">{company.hq.split(',').slice(-2).join(',').trim()}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} className="flex-shrink-0" />
          {formatResearchDate(company.researched_at)}
        </span>
      </div>

      {/* Size */}
      <p className="text-2xs text-muted-foreground font-mono mb-3 truncate">
        {company.size}
      </p>

      {/* Gap severity chips */}
      <div className="flex items-center gap-1.5 mb-3">
        {sevCounts.high > 0 && (
          <span className="flex items-center gap-1 text-2xs font-mono font-semibold bg-severity-high text-severity-high border border-severity-high px-1.5 py-0.5 rounded-sm">
            <AlertTriangle size={10} />
            {sevCounts.high}H
          </span>
        )}
        {sevCounts.medium > 0 && (
          <span className="flex items-center gap-1 text-2xs font-mono font-semibold bg-severity-medium text-severity-medium border border-severity-medium px-1.5 py-0.5 rounded-sm">
            {sevCounts.medium}M
          </span>
        )}
        {sevCounts.low > 0 && (
          <span className="flex items-center gap-1 text-2xs font-mono font-semibold bg-severity-low text-severity-low border border-severity-low px-1.5 py-0.5 rounded-sm">
            {sevCounts.low}L
          </span>
        )}
        <span className="text-2xs text-muted-foreground font-mono ml-1">
          {company.gaps.length} gap{company.gaps.length !== 1 ? 's' : ''} · {company.facts.length} facts
        </span>
      </div>

      {/* Service lines */}
      <div className="flex flex-wrap gap-1 mb-3">
        {serviceLines.map((svc) => (
          <ServiceBadge key={`${company.id}-svc-${svc}`} service={svc} size="sm" />
        ))}
      </div>

      {/* Links row -- buttons, not <a>, since these sit inside the card's
          outer Link. Nested <a> tags are invalid HTML and were causing a
          hydration error as soon as real (non-empty) website/linkedin
          data showed up. */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-border">
        {company.website && company.website !== '#' && company.website !== 'Unknown' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(company.website, '_blank', 'noopener,noreferrer');
            }}
            className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe size={11} />
            Website
          </button>
        )}
        {company.linkedin_url && company.linkedin_url !== 'Unknown' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(company.linkedin_url, '_blank', 'noopener,noreferrer');
            }}
            className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
            LinkedIn
          </button>
        )}
        <span className="flex-1" />
        <span className="flex items-center gap-1 text-2xs text-primary font-medium group-hover:gap-1.5 transition-all">
          Open report
          <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  );
}

function CompanyListRow({
  company,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  company: Company;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const sevCounts = getSeverityCounts(company);
  const hasHighGap = sevCounts.high > 0;

  return (
    <Link
      href={`/company-report?id=${company.id}`}
      onClick={(e) => {
        if (selectMode) {
          e.preventDefault();
          onToggleSelect?.();
        }
      }}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-secondary/50 transition-colors group ${
        hasHighGap ? 'border-l-4 border-l-severity-high' : 'border-l-4 border-l-transparent'
      }`}
      style={selected ? { backgroundColor: 'var(--severity-high-bg)' } : undefined}
    >
      {selectMode && (
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-sm border-2 flex-shrink-0 transition-colors ${
            selected ? 'border-severity-high' : 'border-border-strong bg-card'
          }`}
          style={selected ? { backgroundColor: 'var(--severity-high)' } : undefined}
        >
          {selected && <Check size={12} className="text-white" />}
        </span>
      )}

      <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Building2 size={14} className="text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {company.company_name}
        </p>
        <p className="text-2xs text-muted-foreground font-mono truncate">
          {company.industry}
        </p>
      </div>

      <span className="hidden md:flex items-center gap-1 text-2xs text-muted-foreground font-mono flex-shrink-0 w-36">
        <MapPin size={11} className="flex-shrink-0" />
        <span className="truncate">{company.hq.split(',').slice(-2).join(',').trim()}</span>
      </span>

      <span className="hidden lg:block text-2xs text-muted-foreground font-mono flex-shrink-0 w-28 truncate">
        {company.size}
      </span>

      <span className="hidden sm:flex items-center gap-1 text-2xs text-muted-foreground font-mono flex-shrink-0 w-24">
        <Calendar size={11} className="flex-shrink-0" />
        {formatResearchDate(company.researched_at)}
      </span>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {sevCounts.high > 0 && (
          <span className="flex items-center gap-1 text-2xs font-mono font-semibold bg-severity-high text-severity-high border border-severity-high px-1.5 py-0.5 rounded-sm">
            {sevCounts.high}H
          </span>
        )}
        {sevCounts.medium > 0 && (
          <span className="text-2xs font-mono font-semibold bg-severity-medium text-severity-medium border border-severity-medium px-1.5 py-0.5 rounded-sm">
            {sevCounts.medium}M
          </span>
        )}
        {sevCounts.low > 0 && (
          <span className="text-2xs font-mono font-semibold bg-severity-low text-severity-low border border-severity-low px-1.5 py-0.5 rounded-sm">
            {sevCounts.low}L
          </span>
        )}
      </div>

      <span className="text-2xs text-muted-foreground font-mono flex-shrink-0 hidden xl:inline">
        {company.facts.length} facts
      </span>

      <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </Link>
  );
}
