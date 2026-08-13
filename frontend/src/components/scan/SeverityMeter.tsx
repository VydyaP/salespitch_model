import { cn } from "@/lib/utils";
import type { Severity } from "@/data/companies";

const RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

const TONE: Record<Severity, { bar: string; text: string; border: string }> = {
  high: { bar: "bg-sev-high", text: "text-sev-high", border: "border-sev-high/50" },
  medium: { bar: "bg-sev-medium", text: "text-sev-medium", border: "border-sev-medium/50" },
  low: { bar: "bg-sev-low", text: "text-sev-low", border: "border-sev-low/50" },
};

/**
 * Honest 3-tier meter. The source data only ever holds high/medium/low,
 * so the meter has exactly three segments — no fabricated percentage.
 */
export function SeverityMeter({
  severity,
  size = "md",
  showLabel = true,
}: {
  severity: Severity;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const filled = RANK[severity];
  const tone = TONE[severity];

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("flex items-end gap-[2px]", size === "sm" ? "h-3" : "h-4")}
        aria-hidden
      >
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              "w-[3px] transition-colors",
              step <= filled ? tone.bar : "bg-border-strong",
              step === 1 && "h-1/3",
              step === 2 && "h-2/3",
              step === 3 && "h-full",
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span
          className={cn(
            "data-mono uppercase tracking-[0.14em]",
            tone.text,
            size === "sm" ? "text-[9px]" : "text-[10px]",
          )}
        >
          {severity}
        </span>
      )}
      <span className="sr-only">Severity: {severity}</span>
    </div>
  );
}

export function SeverityTally({
  counts,
  compact = false,
}: {
  counts: { high: number; medium: number; low: number };
  compact?: boolean;
}) {
  const items: Array<[Severity, number]> = [
    ["high", counts.high],
    ["medium", counts.medium],
    ["low", counts.low],
  ];
  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "gap-3")}>
      {items.map(([sev, n]) => (
        <span key={sev} className="flex items-center gap-1.5">
          <span className={cn("size-1.5", n > 0 ? TONE[sev].bar : "bg-border-strong")} />
          <span
            className={cn(
              "data-mono text-[11px]",
              n > 0 ? TONE[sev].text : "text-muted-foreground/50",
            )}
          >
            {n}
          </span>
        </span>
      ))}
    </div>
  );
}

export const severityTone = TONE;
