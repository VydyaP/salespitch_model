'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, ArrowRight, Save, Trash2, Globe, Building2, MapPin, ChevronRight, FileText, Zap, Shield, X } from 'lucide-react';
import { getSeverityCounts, getServiceLines, type Company } from '@/lib/mockData';
import {
  fetchCompanyBySlug,
  fetchSuggestions,
  cancelScan,
  saveCompany,
  discardCompany,
  openScanStream,
  openScanContinueStream,
  type SuggestItem,
} from '@/lib/api';
import SeverityBadge from '@/components/ui/SeverityBadge';
import ServiceBadge from '@/components/ui/ServiceBadge';
import { toast } from 'sonner';

type ResearchStage =
  | 'idle' | 'searching' | 'analyzing' | 'verifying' | 'confirm' | 'review' | 'saved' | 'discarded';

const STAGES = [
  { id: 'searching', label: 'Searching the web', icon: Globe },
  { id: 'analyzing', label: 'Reasoning about gaps', icon: Zap },
  { id: 'verifying', label: 'Fact-checking claims', icon: Shield },
];

const STAGE_TO_INDEX: Record<string, number> = {
  searching: 0,
  analyzing: 1,
  verifying: 2,
};

interface Engine {
  id: string;
  label: string;
  ready: boolean;
  note?: string;
}

// Honest status, not aspirational: only Groq is actually wired into
// retrieve.py's search stage right now. Gemini's search grounding is
// hard-blocked on the free tier (429 on every call), and Claude isn't
// wired into the search stage at all yet -- both stay visibly disabled
// rather than pretending to work.
const ENGINES: Engine[] = [
  { id: 'groq', label: 'Groq', ready: true },
  { id: 'gemini', label: 'Gemini', ready: false, note: 'needs billing' },
  { id: 'claude', label: 'Claude', ready: false, note: 'not wired yet' },
  { id: 'perplexity', label: 'Perplexity', ready: false, note: 'not wired yet' },
];

export default function LiveResearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  // Arriving from a company page's "Re-research" link -- pre-fill and
  // force a fresh scan on submit, but let the person pick an engine
  // first rather than auto-starting before they get a chance to.
  const isRescan = searchParams.get('rescan') === '1';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [engine, setEngine] = useState('groq');
  const [stage, setStage] = useState<ResearchStage>('idle');
  const [statusText, setStatusText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [confirmIndustry, setConfirmIndustry] = useState('');
  const [reviewCompany, setReviewCompany] = useState<Company | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetchSuggestions(inputValue.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [inputValue]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const stageAt = (s: string) => {
    const idx = STAGE_TO_INDEX[s];
    if (idx !== undefined) setStage(s as ResearchStage);
    setStatusText(
      s === 'searching'
        ? 'Searching the web for facts…'
        : s === 'analyzing'
          ? 'Reasoning about gaps…'
          : s === 'verifying'
            ? 'Fact-checking citations…'
            : s
    );
  };

  async function loadDraftAndReview(slug: string) {
    const company = await fetchCompanyBySlug(slug);
    if (!company) {
      toast.error("Research finished but the result couldn't be loaded.");
      reset();
      return;
    }
    setReviewCompany(company);
    setStage('review');
  }

  function attachHandlers(es: EventSource, name: string) {
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.stage === 'done') {
        es.close();
        // Already in the corpus -- go straight to the report, nothing to review.
        window.location.href = `/company-report?id=${encodeURIComponent(data.slug)}`;
      } else if (data.stage === 'ready_for_review') {
        es.close();
        void loadDraftAndReview(data.slug);
      } else if (data.stage === 'confirm') {
        es.close();
        setConfirmIndustry(data.industry || '');
        setStage('confirm');
      } else if (data.stage === 'error') {
        es.close();
        toast.error(data.message || `Search failed for ${name}.`);
        reset();
      } else {
        stageAt(data.stage);
      }
    };
    es.onerror = () => {
      es.close();
      toast.error('Connection to the backend was lost — is server.py running?');
      reset();
    };
  }

  function runResearch(name: string, force = false) {
    setCompanyName(name);
    setStage('searching');
    setStatusText('Starting…');
    esRef.current?.close();
    const es = openScanStream(name, force);
    esRef.current = es;
    attachHandlers(es, name);
  }

  function handleStart() {
    if (!inputValue.trim()) return;
    // isRescan (arrived via a company page's "Re-research" link) forces a
    // real re-scan even though the company is already on file. A plain
    // search-bar lookup of an existing company should still short-circuit
    // straight to its existing report.
    runResearch(inputValue.trim(), isRescan);
  }

  function handleMismatchConfirm() {
    setStage('analyzing');
    setStatusText('Continuing…');
    esRef.current?.close();
    const es = openScanContinueStream(companyName, isRescan);
    esRef.current = es;
    attachHandlers(es, companyName);
  }

  async function handleMismatchCancel() {
    await cancelScan(companyName);
    toast('Scan cancelled — nothing was kept');
    reset();
  }

  async function handleSave() {
    if (!reviewCompany) return;
    await saveCompany(reviewCompany.id);
    toast.success(`"${reviewCompany.company_name}" saved to directory`, {
      description: `${reviewCompany.gaps.length} gaps · ${reviewCompany.facts.length} facts`,
    });
    setStage('saved');
  }

  async function handleDiscard() {
    if (!reviewCompany) return;
    await discardCompany(reviewCompany.id);
    toast('Research discarded', { description: 'Nothing was saved.' });
    setStage('discarded');
  }

  function handleReset() {
    esRef.current?.close();
    esRef.current = null;
    setStage('idle');
    setInputValue('');
    setStatusText('');
    setReviewCompany(null);
    setCompanyName('');
  }

  function reset() {
    esRef.current?.close();
    esRef.current = null;
    setStage('idle');
    setStatusText('');
  }

  const isRunning = ['searching', 'analyzing', 'verifying'].includes(stage);
  const currentStageIdx = STAGE_TO_INDEX[stage] ?? -1;

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" className="btn-ghost text-xs py-1 px-2">
              <ArrowLeft size={14} />
              Directory
            </Link>
            <ChevronRight size={14} className="text-muted-foreground" />
            <span className="section-label text-2xs">Live Research</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Live Research Flow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter a company name to surface gaps, sourced facts, and a pitch — every claim traceable to a source.
          </p>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left: search + progress */}
          <div className="xl:col-span-3 space-y-5">
            {/* Search input */}
            <div className="kraft-card p-5">
              <label className="section-label text-2xs block mb-3">Company Name</label>
              <div className="flex gap-3">
                <div className="relative flex-1" ref={searchRef}>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleStart()}
                    placeholder="e.g. Snowman Logistics, Frigo-Trans, Riviera Cold Chain…"
                    disabled={isRunning}
                    className="input-field pl-9 disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  {showSuggestions && !isRunning && inputValue.trim().length >= 2 && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded shadow-lg z-50 overflow-hidden animate-fade-in">
                      {suggestions.map((s) => (
                        <button
                          key={`${s.source}-${s.name}`}
                          type="button"
                          onClick={() => {
                            setInputValue(s.name);
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary transition-colors duration-100"
                        >
                          <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <Building2 size={13} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                            <p className="text-2xs text-muted-foreground font-mono truncate">
                              {s.source === 'corpus' ? 'Already researched' : 'Not researched yet'}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleStart}
                  disabled={!inputValue.trim() || isRunning}
                  className="btn-primary flex-shrink-0"
                >
                  {isRunning ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Researching…
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      Research
                    </>
                  )}
                </button>
              </div>

              {/* Engine picker */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-2xs text-muted-foreground font-mono uppercase tracking-wide mr-1">Engine:</span>
                {ENGINES.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    disabled={!e.ready || isRunning}
                    onClick={() => setEngine(e.id)}
                    title={e.ready ? 'Active engine' : e.note}
                    className={`flex items-center gap-1 px-2 py-1 text-2xs font-mono font-medium rounded-sm border transition-all duration-100 ${
                      e.ready && engine === e.id
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : e.ready
                          ? 'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                          : 'text-muted-foreground/40 border-border cursor-not-allowed'
                    }`}
                  >
                    {e.label}
                    {!e.ready && <span className="opacity-70">· {e.note}</span>}
                  </button>
                ))}
              </div>

              {stage === 'idle' && isRescan && (
                <p className="text-xs text-primary mt-2.5 font-mono">
                  Re-researching &quot;{initialQuery}&quot; — pick an engine, then hit Research to force a fresh scan.
                </p>
              )}
              {stage === 'idle' && !isRescan && (
                <p className="text-xs text-muted-foreground mt-2.5 font-mono">
                  Works best with cold storage operators, logistics firms, and pharma distributors.
                </p>
              )}
            </div>

            {/* Stage progress */}
            {stage !== 'idle' && stage !== 'discarded' && (
              <div className="kraft-card p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <span className="section-label text-2xs">Research Progress</span>
                  {isRunning && (
                    <span className="flex items-center gap-1.5 text-xs text-primary font-mono animate-pulse-amber">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Live
                    </span>
                  )}
                  {(stage === 'review' || stage === 'saved') && (
                    <span className="flex items-center gap-1.5 text-xs text-severity-low font-mono">
                      <CheckCircle2 size={13} />
                      Complete
                    </span>
                  )}
                </div>

                <div className="mb-5">
                  <span className="text-xs font-mono text-muted-foreground">{companyName}</span>
                </div>

                {/* Stage indicators */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {STAGES.map((s, idx) => {
                    const IconComp = s.icon;
                    const isDone =
                      stage === 'review' || stage === 'saved' || (isRunning && currentStageIdx > idx);
                    const isActive = isRunning && currentStageIdx === idx;

                    return (
                      <div
                        key={`stage-indicator-${s.id}`}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded border transition-all duration-300 ${
                          isDone
                            ? 'bg-severity-low border-severity-low'
                            : isActive
                            ? 'bg-primary/10 border-primary/30' :'bg-muted/50 border-border'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} className="text-severity-low" />
                        ) : isActive ? (
                          <Loader2 size={16} className="text-primary animate-spin" />
                        ) : (
                          <IconComp size={16} className="text-muted-foreground" />
                        )}
                        <span
                          className={`text-2xs font-mono text-center leading-tight ${
                            isDone
                              ? 'text-severity-low'
                              : isActive
                              ? 'text-primary' :'text-muted-foreground'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {statusText && (
                  <p className="text-xs text-muted-foreground font-mono">{statusText}</p>
                )}
              </div>
            )}

            {/* Mismatch / scope warning */}
            {stage === 'confirm' && (
              <div className="kraft-card border-l-4 border-l-severity-medium p-5 animate-slide-up">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-severity-medium flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      Outside GND&apos;s focus sectors
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong className="text-foreground">&quot;{companyName}&quot;</strong> was researched as{' '}
                      <strong className="text-severity-medium">{confirmIndustry || 'an unclear industry'}</strong> —
                      not cold chain, logistics, or pharma. Gap analysis against GND&apos;s service lines may not be meaningful here.
                    </p>
                    <div className="flex items-center gap-3">
                      <button onClick={handleMismatchConfirm} className="btn-secondary text-sm">
                        Continue anyway
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => void handleMismatchCancel()}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={14} />
                        Cancel scan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Review actions */}
            {stage === 'review' && reviewCompany && (
              <div className="kraft-card p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="section-label text-2xs block mb-0.5">Review Required</span>
                    <h3 className="text-base font-bold text-foreground">
                      Research ready — save to directory?
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void handleDiscard()} className="btn-secondary text-sm">
                      <Trash2 size={14} />
                      Discard
                    </button>
                    <button onClick={() => void handleSave()} className="btn-primary text-sm">
                      <Save size={14} />
                      Save to Directory
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  This report will not be stored until you explicitly save it. Review the full report on the right before deciding.
                </p>
              </div>
            )}

            {/* Saved / discarded state */}
            {stage === 'saved' && reviewCompany && (
              <div className="kraft-card border-l-4 border-l-severity-low p-5 animate-slide-up">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-severity-low flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Saved to directory</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      &quot;{reviewCompany.company_name}&quot; is now in your company directory.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/company-report?id=${reviewCompany.id}`} className="btn-primary text-sm">
                      Open Report
                      <ChevronRight size={14} />
                    </Link>
                    <button onClick={handleReset} className="btn-secondary text-sm">
                      New Research
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stage === 'discarded' && (
              <div className="kraft-card p-5 animate-slide-up">
                <div className="flex items-center gap-3">
                  <XCircle size={20} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Research discarded</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Nothing was saved to the directory.</p>
                  </div>
                  <button onClick={handleReset} className="btn-secondary text-sm">
                    Research Another
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: preview / instructions */}
          <div className="xl:col-span-2 space-y-4">
            {stage === 'idle' ? (
              <ResearchGuide />
            ) : (stage === 'review' || stage === 'saved') && reviewCompany ? (
              <ReviewPreview company={reviewCompany} />
            ) : (
              <ResearchGuide minimal />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchGuide({ minimal = false }: { minimal?: boolean }) {
  return (
    <div className="kraft-card p-5 space-y-4">
      {!minimal && (
        <>
          <span className="section-label text-2xs block">How It Works</span>
          <div className="space-y-3">
            {[
              {
                id: 'hw-1',
                step: '01',
                title: 'Enter company name',
                desc: 'Type any cold-chain operator, logistics firm, or pharma distributor.',
              },
              {
                id: 'hw-2',
                step: '02',
                title: 'Live research runs',
                desc: 'The tool searches public sources, reasons about gaps, and fact-checks every claim.',
              },
              {
                id: 'hw-3',
                step: '03',
                title: 'Review before saving',
                desc: "Nothing is stored until you explicitly approve it — you control the directory.",
              },
              {
                id: 'hw-4',
                step: '04',
                title: 'Open the report',
                desc: 'Use the sourced gaps and pitch opener right before your call.',
              },
            ].map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-primary/60 w-6 flex-shrink-0">{item.step}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pt-3 border-t border-border">
        <span className="section-label text-2xs block mb-2">GND Service Lines</span>
        <div className="space-y-1.5">
          {[
            { id: 'sl-cold', label: 'Cold Chain Management' as const, desc: 'Real-time temp monitoring, alerts, compliance' },
            { id: 'sl-wms', label: 'Warehouse Management' as const, desc: 'WMS with sensor integration' },
            { id: 'sl-asset', label: 'Asset Tracking & Monitoring' as const, desc: 'Fleet and equipment telematics' },
            { id: 'sl-eng', label: 'Product Engineering' as const, desc: 'Custom IoT hardware development' },
            { id: 'sl-platform', label: 'Platform' as const, desc: 'API, dashboards, data integration' },
          ].map((svc) => (
            <div key={svc.id} className="flex items-center gap-2">
              <ServiceBadge service={svc.label} size="sm" />
              <span className="text-2xs text-muted-foreground truncate">{svc.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewPreview({ company }: { company: Company }) {
  const sevCounts = getSeverityCounts(company);
  const serviceLines = getServiceLines(company);

  return (
    <div className="kraft-card p-5 space-y-4 animate-slide-up">
      <span className="section-label text-2xs block">Report Preview</span>

      {/* Company header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Building2 size={18} className="text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">{company.company_name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{company.industry}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={11} className="text-muted-foreground" />
            <span className="text-2xs text-muted-foreground font-mono">{company.hq}</span>
          </div>
        </div>
      </div>

      {/* Gap summary */}
      <div>
        <span className="section-label text-2xs block mb-2">Gaps Found</span>
        <div className="flex items-center gap-2 mb-3">
          {sevCounts.high > 0 && (
            <span className="flex items-center gap-1 text-xs font-mono font-semibold bg-severity-high text-severity-high border border-severity-high px-2 py-0.5 rounded-sm">
              {sevCounts.high} High
            </span>
          )}
          {sevCounts.medium > 0 && (
            <span className="flex items-center gap-1 text-xs font-mono font-semibold bg-severity-medium text-severity-medium border border-severity-medium px-2 py-0.5 rounded-sm">
              {sevCounts.medium} Medium
            </span>
          )}
          {sevCounts.low > 0 && (
            <span className="flex items-center gap-1 text-xs font-mono font-semibold bg-severity-low text-severity-low border border-severity-low px-2 py-0.5 rounded-sm">
              {sevCounts.low} Low
            </span>
          )}
        </div>
        <div className="space-y-2">
          {company.gaps.slice(0, 3).map((gap) => (
            <div
              key={`preview-gap-${gap.id}`}
              className={`p-2.5 rounded border-l-2 bg-background ${
                gap.severity === 'high' ?'border-l-severity-high'
                  : gap.severity === 'medium' ?'border-l-severity-medium' :'border-l-severity-low'
              }`}
            >
              <div className="flex items-start gap-2">
                <SeverityBadge severity={gap.severity} size="sm" />
                <p className="text-xs font-medium text-foreground leading-snug">{gap.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service lines */}
      <div>
        <span className="section-label text-2xs block mb-2">GND Service Lines Hit</span>
        <div className="flex flex-wrap gap-1.5">
          {serviceLines.map((svc) => (
            <ServiceBadge key={`preview-svc-${svc}`} service={svc} size="sm" />
          ))}
        </div>
      </div>

      {/* Pitch opener preview */}
      <div className="bg-primary/5 border border-primary/20 rounded p-3">
        <span className="section-label text-2xs block mb-1.5">Pitch Opener</span>
        <p className="text-xs text-foreground leading-relaxed italic">&ldquo;{company.pitch.opener}&rdquo;</p>
      </div>

      {/* Facts count */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <FileText size={13} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-mono">
          {company.facts.length} sourced facts — all claims traceable to URLs
        </span>
      </div>
    </div>
  );
}
