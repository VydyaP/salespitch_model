import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { slugify, type Company } from "@/data/companies";
import {
  cancelScan,
  discardCompany,
  fetchCompanyBySlug,
  fetchSuggestions,
  openScanContinueStream,
  openScanStream,
  saveCompany,
  type SuggestItem,
} from "@/lib/api";
import { scanStore } from "@/lib/scan-store";
import { CompanyReport } from "./CompanyReport";

const ENGINES = [
  { id: "groq", label: "Groq", ready: true },
  { id: "perplexity", label: "Perplexity", ready: false },
  { id: "exa", label: "Exa", ready: false },
  { id: "tavily", label: "Tavily", ready: false },
];

// Mirrors the real stages server.py's /api/scan/research actually emits --
// no fake "extracting claims" step that doesn't exist in the real pipeline.
const STAGE_ORDER = ["searching", "analyzing", "verifying"] as const;
const STAGE_TEXT: Record<string, string> = {
  searching: "Searching the web for facts…",
  analyzing: "Reasoning about gaps…",
  verifying: "Fact-checking citations…",
};

type Phase = "idle" | "running" | "confirm" | "review";

export function SearchConsole({ companies }: { companies: Company[] }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState("groq");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [draft, setDraft] = useState<Company | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [confirmInfo, setConfirmInfo] = useState<{ industry: string } | null>(null);
  const [webSuggestions, setWebSuggestions] = useState<SuggestItem[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close any open stream if the component unmounts mid-scan.
  useEffect(() => () => esRef.current?.close(), []);

  const q = query.trim().toLowerCase();

  const scannedMatches = useMemo(
    () =>
      q.length < 1
        ? []
        : companies
            .filter(
              (c) =>
                c.company_name.toLowerCase().includes(q) ||
                c.industry.toLowerCase().includes(q) ||
                c.hq.toLowerCase().includes(q),
            )
            .slice(0, 6),
    [companies, q],
  );

  // Debounced live suggestions from the real backend (corpus + Clearbit),
  // instead of a static hardcoded list.
  useEffect(() => {
    if (q.length < 2) {
      setWebSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetchSuggestions(q)
        .then((items) => setWebSuggestions(items.filter((i) => i.source === "new")))
        .catch(() => setWebSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const stageAt = (stage: string) => {
    const i = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
    if (i >= 0) setStageIndex(i);
    setStatusText(STAGE_TEXT[stage] ?? stage);
  };

  const loadDraftAndReview = async (slug: string) => {
    const company = await fetchCompanyBySlug(slug);
    if (!company) {
      toast.error("Research finished but the result couldn't be loaded.");
      reset();
      return;
    }
    setDraft(company);
    setPhase("review");
  };

  const attachHandlers = (es: EventSource, name: string) => {
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.stage === "done") {
        es.close();
        // Already existed in the corpus -- nothing to review, go straight there.
        navigate({ to: "/company/$slug", params: { slug: data.slug } });
        reset();
      } else if (data.stage === "ready_for_review") {
        es.close();
        void loadDraftAndReview(data.slug);
      } else if (data.stage === "confirm") {
        es.close();
        setConfirmInfo({ industry: data.industry });
        setPhase("confirm");
      } else if (data.stage === "error") {
        es.close();
        toast.error(data.message || `Search failed for ${name}.`);
        reset();
      } else {
        stageAt(data.stage);
      }
    };
    es.onerror = () => {
      es.close();
      toast.error("Connection to the backend was lost — is server.py running?");
      reset();
    };
  };

  const runScan = (name: string) => {
    setPendingName(name);
    setPhase("running");
    setStageIndex(0);
    setStatusText("Starting…");
    esRef.current?.close();
    const es = openScanStream(name);
    esRef.current = es;
    attachHandlers(es, name);
  };

  const continueScan = () => {
    setPhase("running");
    setStageIndex(0);
    setStatusText("Continuing…");
    esRef.current?.close();
    const es = openScanContinueStream(pendingName);
    esRef.current = es;
    attachHandlers(es, pendingName);
  };

  const submit = () => {
    const name = query.trim();
    if (!name) return;
    const existing = companies.find(
      (c) => c.company_name.toLowerCase() === name.toLowerCase() || c.slug === slugify(name),
    );
    if (existing) {
      navigate({ to: "/company/$slug", params: { slug: existing.slug } });
      return;
    }
    runScan(name);
  };

  const reset = () => {
    esRef.current?.close();
    esRef.current = null;
    setPhase("idle");
    setDraft(null);
    setConfirmInfo(null);
    setStageIndex(0);
    setStatusText("");
  };

  const cancelConfirm = async () => {
    await cancelScan(pendingName);
    toast("Scan cancelled — nothing was kept");
    reset();
  };

  const save = async () => {
    if (!draft) return;
    await saveCompany(draft.slug);
    scanStore.publish(draft);
    toast.success(`${draft.company_name} published to the scanned list`);
    const slug = draft.slug;
    reset();
    setQuery("");
    navigate({ to: "/company/$slug", params: { slug } });
  };

  const discard = async () => {
    if (!draft) return;
    await discardCompany(draft.slug);
    toast("Draft discarded — nothing was kept");
    reset();
  };

  return (
    <section>
      {/* ---------- search bar ---------- */}
      <div className="relative">
        <div className="flex items-stretch border border-border-strong bg-surface focus-within:border-primary/70">
          <span className="grid w-10 place-items-center text-muted-foreground">
            <Search className="size-4" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={phase === "running"}
            placeholder="Company name — e.g. Snowman Logistics, Coldrush Supply Chain"
            className="h-11 flex-1 bg-transparent data-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
            aria-label="Search a prospect company"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="grid w-8 place-items-center text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={phase === "running" || !query.trim()}
            className="flex items-center gap-1.5 border-l border-border-strong bg-primary/10 px-4 data-mono text-[10px] tracking-[0.16em] uppercase text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            Scan <ArrowRight className="size-3" />
          </button>
        </div>

        {/* engine strip */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="label-xs">Engine</span>
          {ENGINES.map((e) => (
            <button
              key={e.id}
              type="button"
              disabled={!e.ready}
              onClick={() => setEngine(e.id)}
              title={e.ready ? "Active engine" : "Not connected yet"}
              className={cn(
                "flex items-center gap-1.5 border px-1.5 py-0.5 data-mono text-[10px] tracking-[0.1em] uppercase",
                e.ready && engine === e.id
                  ? "border-signal/60 bg-signal/10 text-signal"
                  : e.ready
                    ? "border-border-strong text-muted-foreground"
                    : "cursor-not-allowed border-border text-muted-foreground/40",
              )}
            >
              {e.ready && engine === e.id && <span className="size-1.5 bg-signal" />}
              {e.label}
              {!e.ready && <span className="text-[8px] opacity-70">soon</span>}
            </button>
          ))}
          <span className="data-mono ml-auto hidden text-[10px] text-stamp sm:inline">
            press / to focus
          </span>
        </div>

        {/* ---------- autocomplete ---------- */}
        {phase === "idle" && q.length > 0 && (scannedMatches.length > 0 || webSuggestions.length > 0) && (
          <div className="absolute inset-x-0 top-12 z-30 border border-border-strong bg-popover shadow-2xl shadow-black/50">
            {scannedMatches.length > 0 && (
              <div>
                <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                  <span className="label-xs text-signal">Already scanned · instant</span>
                  <span className="label-xs">{scannedMatches.length}</span>
                </div>
                {scannedMatches.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => navigate({ to: "/company/$slug", params: { slug: c.slug } })}
                    className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left hover:bg-accent"
                  >
                    <span className="size-1.5 shrink-0 bg-signal" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                      {c.company_name}
                    </span>
                    <span className="data-mono hidden truncate text-[10px] text-muted-foreground sm:block sm:max-w-[45%]">
                      {c.industry}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {webSuggestions.length > 0 && (
              <div>
                <div className="border-b border-border bg-surface/60 px-3 py-1.5">
                  <span className="label-xs text-primary">Not scanned · needs a new search</span>
                </div>
                {webSuggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setQuery(s.name);
                      runScan(s.name);
                    }}
                    className="flex w-full items-center gap-3 border-b border-dashed border-border px-3 py-2 text-left hover:bg-accent"
                  >
                    <span className="size-1.5 shrink-0 border border-primary/70" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground italic">
                      {s.name}
                    </span>
                    <span className="stamp-box border-primary/40 text-primary">scan</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------- running ---------- */}
      {phase === "running" && (
        <div className="mt-4 border border-border-strong bg-surface">
          <div className="relative h-[2px] overflow-hidden bg-border">
            <div className="animate-sweep absolute inset-y-0 w-1/3 bg-primary" />
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="animate-dot size-1.5 bg-primary" />
              <span className="data-mono text-[11px] tracking-[0.14em] uppercase text-primary">
                Scanning · {engine}
              </span>
              <span className="data-mono text-[11px] text-muted-foreground">{pendingName}</span>
            </div>
            <ol className="mt-3 space-y-1.5">
              {STAGE_ORDER.map((stage, i) => (
                <li
                  key={stage}
                  className={cn(
                    "flex items-center gap-2 data-mono text-[12px]",
                    i < stageIndex
                      ? "text-muted-foreground"
                      : i === stageIndex
                        ? "text-foreground"
                        : "text-muted-foreground/35",
                  )}
                >
                  <span className="w-4 text-center">
                    {i < stageIndex ? "✓" : i === stageIndex ? "›" : "·"}
                  </span>
                  {STAGE_TEXT[stage]}
                  {i === stageIndex && <span className="animate-cursor">▌</span>}
                </li>
              ))}
            </ol>
            {statusText && !STAGE_ORDER.includes(statusText as (typeof STAGE_ORDER)[number]) && (
              <p className="data-mono mt-2 text-[11px] text-muted-foreground">{statusText}</p>
            )}
          </div>
        </div>
      )}

      {/* ---------- off-topic confirmation gate ---------- */}
      {phase === "confirm" && confirmInfo && (
        <div className="mt-4 border border-sev-medium/50 bg-sev-medium/5">
          <div className="flex items-center gap-2 border-b border-sev-medium/30 px-4 py-2">
            <AlertTriangle className="size-3.5 text-sev-medium" />
            <span className="data-mono text-[11px] tracking-[0.14em] uppercase text-sev-medium">
              Outside GND's focus sectors
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="max-w-[70ch] text-[13px] leading-relaxed text-foreground/90">
              <span className="data-mono">{pendingName}</span> was researched as{" "}
              <span className="text-sev-medium">{confirmInfo.industry}</span> — not cold chain,
              logistics or pharma. Gap analysis against GND's service lines may not be meaningful
              here. Confirm before a pitch is generated.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={continueScan}
                className="border border-sev-medium/60 px-3 py-1.5 data-mono text-[10px] tracking-[0.14em] uppercase text-sev-medium hover:bg-sev-medium/10"
              >
                Continue anyway
              </button>
              <button
                type="button"
                onClick={() => void cancelConfirm()}
                className="border border-border-strong px-3 py-1.5 data-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground"
              >
                Cancel scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- review gate ---------- */}
      {phase === "review" && draft && (
        <div className="mt-4 border border-primary/50">
          <div className="flex flex-wrap items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2">
            <span className="data-mono text-[11px] tracking-[0.14em] uppercase text-primary">
              Unpublished draft · review required
            </span>
            <span className="data-mono text-[10px] text-muted-foreground">
              nothing is added to the list until you save
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => void save()}
                className="border border-primary bg-primary px-3 py-1.5 data-mono text-[10px] tracking-[0.14em] uppercase text-primary-foreground hover:opacity-90"
              >
                Save & publish
              </button>
              <button
                type="button"
                onClick={() => void discard()}
                className="border border-border-strong px-3 py-1.5 data-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:border-destructive/60 hover:text-destructive"
              >
                Discard
              </button>
            </div>
          </div>
          <div className="bg-background">
            <CompanyReport company={draft} />
          </div>
        </div>
      )}
    </section>
  );
}
