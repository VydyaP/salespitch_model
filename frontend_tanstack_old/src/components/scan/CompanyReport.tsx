import { useState } from "react";
import { Download, ExternalLink, Globe, Linkedin, Minus, Phone, Plus, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company, Gap, VerificationStatus } from "@/data/companies";
import { severityCount } from "@/data/companies";
import { SeverityMeter } from "./SeverityMeter";
import { downloadReport } from "@/lib/export-report";

const SEV_ORDER = { high: 0, medium: 1, low: 2 } as const;

const SEV_CHIP = {
  high: "border-sev-high/30 bg-sev-high/10 text-sev-high",
  medium: "border-sev-medium/30 bg-sev-medium/10 text-sev-medium",
  low: "border-sev-low/30 bg-sev-low/10 text-sev-low",
} as const;

const GAP_ROW_TONE = {
  high: { border: "border-l-sev-high", tint: "bg-sev-high/[0.05] hover:bg-sev-high/[0.09]" },
  medium: { border: "border-l-sev-medium", tint: "bg-sev-medium/[0.04] hover:bg-sev-medium/[0.07]" },
  low: { border: "border-l-border-strong", tint: "hover:bg-surface/60" },
} as const;

// verify.py's deterministic word-overlap check against the sourced facts --
// a blunt, explainable signal, not a semantic AI judgement of itself.
const VERIFY_LABEL: Record<VerificationStatus, string> = {
  VERIFIED: "Verified",
  WEAK: "Weak match",
  UNVERIFIED: "Unverified",
};

const VERIFY_TONE: Record<VerificationStatus, { text: string; dot: string }> = {
  VERIFIED: { text: "text-signal", dot: "bg-signal" },
  WEAK: { text: "text-sev-medium", dot: "bg-sev-medium" },
  UNVERIFIED: { text: "text-sev-high", dot: "bg-sev-high" },
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-border px-3 py-1.5 first:border-l-0 first:pl-0">
      <div className="label-xs">{label}</div>
      <div className="data-mono mt-1 truncate text-[12px] text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}

function GapRow({
  gap,
  index,
  factIndex,
  factUrl,
  defaultOpen,
}: {
  gap: Gap;
  index: number;
  factIndex: number | null;
  factUrl: string | null;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const tone = GAP_ROW_TONE[gap.severity];

  return (
    <div
      className={cn(
        "group border-b border-b-border border-l-4 transition-colors print:break-inside-avoid",
        tone.border,
        open ? "bg-surface" : tone.tint,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="data-mono mt-0.5 w-6 shrink-0 text-[10px] text-muted-foreground/70">
          G{String(index + 1).padStart(2, "0")}
        </span>
        <span className="mt-0.5 shrink-0">
          <SeverityMeter severity={gap.severity} showLabel={false} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block leading-snug text-foreground",
              gap.severity === "high" && "text-[15.5px] font-semibold",
              gap.severity === "medium" && "text-[14px] font-medium",
              gap.severity === "low" && "text-[13px] font-medium text-foreground/80",
            )}
          >
            {gap.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="stamp-box">{gap.severity}</span>
            <span className="data-mono text-[10px] tracking-wider text-signal uppercase">
              {gap.gnd_service}
            </span>
            {gap.verification_status && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 data-mono text-[10px] tracking-wider uppercase",
                  VERIFY_TONE[gap.verification_status].text,
                )}
                title="Independently checked against the sourced facts (verify.py)"
              >
                <span className={cn("size-1.5 rounded-full", VERIFY_TONE[gap.verification_status].dot)} />
                {VERIFY_LABEL[gap.verification_status]}
              </span>
            )}
          </span>
        </span>
        <span className="no-print mt-1 shrink-0 text-muted-foreground group-hover:text-foreground">
          {open ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
        </span>
      </button>

      {/* Always rendered in the DOM (not conditionally mounted) so print
          can force it visible regardless of on-screen open/closed state --
          otherwise collapsed gaps would print with no detail or citation. */}
      <div className={cn("px-3 pb-3 pl-[4.1rem] print:block", open ? "block" : "hidden")}>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
          {gap.detail}
        </p>
        <div className="mt-2.5 border-l-2 border-border-strong pl-2.5">
          {factUrl ? (
            <a
              href={factUrl}
              target="_blank"
              rel="noreferrer"
              className="label-xs inline-flex items-center gap-1 text-foreground/85 underline decoration-border-strong underline-offset-2 hover:text-primary hover:decoration-primary"
            >
              Derived from fact {factIndex !== null ? `F${String(factIndex + 1).padStart(2, "0")}` : "—"}
              <ExternalLink className="size-2.5 shrink-0 opacity-60" />
            </a>
          ) : (
            <div className="label-xs">
              Derived from fact {factIndex !== null ? `F${String(factIndex + 1).padStart(2, "0")}` : "—"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  href?: string | undefined;
}) {
  const known = value !== "Unknown";
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
      <span className="label-xs w-16 shrink-0">{label}</span>
      {known && href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate text-[13px] text-foreground underline decoration-border-strong underline-offset-2 hover:text-primary hover:decoration-primary"
        >
          {value}
        </a>
      ) : (
        <span className="min-w-0 truncate text-[13px] text-muted-foreground/60">{value}</span>
      )}
    </div>
  );
}

function ContactBlock({ company }: { company: Company }) {
  return (
    <div className="mt-6 print:break-inside-avoid">
      <div className="border-b border-border-strong pb-1.5">
        <h2 className="data-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground">
          Contact
        </h2>
      </div>
      <div className="divide-y divide-border/60">
        <ContactRow icon={Globe} label="Website" value={company.website} href={company.website !== "Unknown" ? company.website : undefined} />
        <ContactRow icon={Linkedin} label="LinkedIn" value={company.linkedin_url} href={company.linkedin_url !== "Unknown" ? company.linkedin_url : undefined} />
        <ContactRow icon={Phone} label="Phone" value={company.phone} />
      </div>
    </div>
  );
}

export function CompanyReport({
  company,
  actions,
}: {
  company: Company;
  actions?: React.ReactNode;
}) {
  const counts = severityCount(company);
  const gaps = [...company.gaps].sort(
    (a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity],
  );

  const factOf = (claim: string) => {
    const i = company.facts.findIndex((f) => f.claim === claim);
    return i === -1 ? null : { index: i, fact: company.facts[i]! };
  };

  return (
    <article>
      {/* ---- compact identity strip: no hero, gaps stay above the fold ---- */}
      <div className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-[1600px] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="label-xs">Dossier</span>
                <span className="data-mono text-[10px] text-muted-foreground/70">
                  scanned {company.scanned_at}
                </span>
                <span className="stamp-box border-signal/40 text-signal">verified sources</span>
              </div>
              <h1 className="mt-1 truncate text-[22px] leading-tight font-semibold tracking-tight text-foreground">
                {company.company_name}
              </h1>
            </div>
            <div className="no-print flex items-center gap-2">
              {actions}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 border border-border-strong px-3 py-2 data-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Printer className="size-3" /> Print
              </button>
              <button
                type="button"
                onClick={() => downloadReport(company)}
                className="inline-flex items-center gap-1.5 border border-border-strong px-3 py-2 data-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Download className="size-3" /> Export
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-stretch gap-y-1">
            <StatCell label="Industry" value={company.industry} />
            <StatCell label="HQ" value={company.hq} />
            <StatCell label="Founded" value={company.founded} />
            <StatCell label="Size" value={company.size} />
            <div className="border-l border-border px-3 py-1.5">
              <div className="label-xs">Gap profile</div>
              <div className="mt-1 flex items-center gap-1">
                {(
                  [
                    ["high", counts.high],
                    ["medium", counts.medium],
                    ["low", counts.low],
                  ] as const
                ).map(([sev, n]) => (
                  <span
                    key={sev}
                    className={cn(
                      "rounded border px-1.5 py-0.5 data-mono text-[12px] font-semibold leading-none",
                      n > 0 ? SEV_CHIP[sev] : "border-border text-muted-foreground/40",
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- gaps first, pitch + facts in the rail ---- */}
      <div className="mx-auto grid max-w-[1600px] gap-0 px-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8 print:block print:px-0">
        <section className="pt-4 pb-10">
          <div className="flex items-baseline justify-between border-b border-border-strong pb-1.5">
            <h2 className="data-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground">
              Operational gaps
            </h2>
            <span className="data-mono text-[10px] text-muted-foreground">
              {company.gaps.length} identified · sorted by severity
            </span>
          </div>
          <div>
            {gaps.map((gap, i) => {
              const src = factOf(gap.based_on);
              return (
                <GapRow
                  key={gap.title}
                  gap={gap}
                  index={i}
                  factIndex={src?.index ?? null}
                  factUrl={src?.fact.source_url ?? null}
                  defaultOpen={i === 0}
                />
              );
            })}
          </div>

          <ContactBlock company={company} />
        </section>

        <aside className="pb-14 lg:pt-4">
          {/* facts */}
          <div>
            <div className="flex items-baseline justify-between border-b border-border-strong pb-1.5">
              <h2 className="data-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground">
                Sourced facts
              </h2>
              <span className="data-mono text-[10px] text-muted-foreground">
                {company.facts.length} · stage 1
              </span>
            </div>
            <ol>
              {company.facts.map((fact, i) => (
                <li key={fact.claim} className="border-b border-border py-2.5 print:break-inside-avoid">
                  <div className="flex gap-3">
                    <span className="data-mono w-6 shrink-0 text-[10px] text-muted-foreground/70">
                      F{String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <a
                        href={fact.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-start gap-1.5 text-[14px] leading-snug text-foreground underline decoration-border-strong underline-offset-2 hover:text-primary hover:decoration-primary"
                      >
                        {fact.claim}
                        <ExternalLink className="mt-1 size-3 shrink-0 opacity-50 group-hover:opacity-100" />
                      </a>
                      <blockquote className="mt-1.5 border-l border-border-strong pl-2 text-[12.5px] leading-relaxed text-muted-foreground italic">
                        “{fact.source_snippet}”
                      </blockquote>
                      <div className="data-mono mt-1 truncate text-[10px] text-stamp">
                        {fact.source_url.replace(/^https?:\/\//, "")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {/* pitch — the one thing on this screen someone is about to say out
          loud, so it closes the report as its own full-width section
          instead of being squeezed into the side rail */}
      <div className="border-t border-border-strong bg-surface">
        <div className="mx-auto max-w-[900px] px-4 py-8">
          <div className="border-l-[3px] border-primary pl-5">
            <div className="flex items-center justify-between">
              <h2 className="data-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-primary">
                Pitch angle
              </h2>
              <span className="label-xs">Stage 2 · judgement</span>
            </div>
            <p className="mt-3 text-[18px] leading-relaxed font-medium text-foreground italic">
              “{company.pitch.angle}”
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
