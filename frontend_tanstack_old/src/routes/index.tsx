import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { GND_SERVICES, severityCount, type Severity } from "@/data/companies";
import { useCompanies } from "@/lib/scan-store";
import { fetchCompanies } from "@/lib/api";
import { SearchConsole } from "@/components/scan/SearchConsole";
import { SeverityTally } from "@/components/scan/SeverityMeter";
import { TopBar } from "@/components/scan/TopBar";

export const Route = createFileRoute("/")({
  loader: async () => {
    // Returned via Route.useLoaderData() below -- NOT written into
    // scanStore from here. A loader runs during SSR; mutating an
    // external module-level store as a side effect isn't reliably
    // visible to useSyncExternalStore reads in the same render pass,
    // which is what caused this to silently show 0 companies at first.
    try {
      return { companies: await fetchCompanies() };
    } catch {
      return { companies: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Prospect Scan — cold-chain gap analysis for GND Solutions" },
      {
        name: "description",
        content:
          "Internal sales research workbench: sourced company facts, operational gaps mapped to GND service lines, and a ready pitch opener before every call.",
      },
      {
        property: "og:title",
        content: "Prospect Scan — cold-chain gap analysis for GND Solutions",
      },
      {
        property: "og:description",
        content:
          "Search a prospect, see sourced facts, severity-ranked operational gaps and a pitch opener in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type SortKey = "risk" | "name" | "recent";

const STAT_TONES = {
  high: "border-sev-high/30 bg-sev-high/10 text-sev-high",
  medium: "border-sev-medium/30 bg-sev-medium/10 text-sev-medium",
  low: "border-sev-low/30 bg-sev-low/10 text-sev-low",
} as const;

const ROW_TONES = {
  high: "bg-sev-high/[0.045] hover:bg-sev-high/[0.09]",
  medium: "bg-sev-medium/[0.035] hover:bg-sev-medium/[0.07]",
  low: "hover:bg-surface",
} as const;

const BAR_TONES = {
  high: "bg-sev-high",
  medium: "bg-sev-medium",
  low: "bg-sev-low",
} as const;

function Index() {
  // loaded: the real backend list, straight from the loader -- correct
  // and present on first paint, server and client alike.
  // published: only companies found+saved via live search THIS session
  // (scanStore starts empty; SearchConsole calls scanStore.publish()
  // after a real Save). Merged so a just-published company shows up
  // immediately without needing a full refetch.
  const { companies: loaded } = Route.useLoaderData();
  const published = useCompanies();
  const companies = useMemo(() => {
    const extra = published.filter((p) => !loaded.some((l) => l.slug === p.slug));
    return [...extra, ...loaded];
  }, [loaded, published]);

  const [service, setService] = useState<string>("all");
  const [minSev, setMinSev] = useState<Severity | "all">("all");
  const [sort, setSort] = useState<SortKey>("risk");

  const rows = useMemo(() => {
    const filtered = companies.filter((c) => {
      const byService = service === "all" || c.gaps.some((g) => g.gnd_service === service);
      const bySev =
        minSev === "all" ||
        c.gaps.some((g) =>
          minSev === "high"
            ? g.severity === "high"
            : minSev === "medium"
              ? g.severity !== "low"
              : true,
        );
      return byService && bySev;
    });
    const risk = (i: number, m: number) => i * 3 + m;
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.company_name.localeCompare(b.company_name);
      if (sort === "recent") return b.scanned_at.localeCompare(a.scanned_at);
      const ca = severityCount(a);
      const cb = severityCount(b);
      return risk(cb.high, cb.medium) - risk(ca.high, ca.medium);
    });
  }, [companies, service, minSev, sort]);

  const totals = companies.reduce(
    (acc, c) => {
      const s = severityCount(c);
      acc.high += s.high;
      acc.medium += s.medium;
      acc.low += s.low;
      acc.facts += c.facts.length;
      return acc;
    },
    { high: 0, medium: 0, low: 0, facts: 0 },
  );

  return (
    <div className="min-h-screen">
      <TopBar
        right={
          <span className="data-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
            {companies.length} prospects · {totals.facts} sourced facts
          </span>
        }
      />

      {/* console header */}
      <div className="grid-bg border-b border-border">
        <div className="mx-auto max-w-[1600px] fluid-px fluid-py">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="label-xs">Prospect research console</div>
              <p className="mt-1 max-w-[58ch] text-[14px] leading-snug text-foreground/85">
                Two-stage pipeline:{" "}
                <span className="text-signal">facts are researched and sourced first</span>, gaps
                and pitch are reasoned from those facts only. Every claim links to its source.
              </p>
            </div>
            <div className="flex items-stretch gap-2">
              {(
                [
                  ["High", totals.high, "high"],
                  ["Medium", totals.medium, "medium"],
                  ["Low", totals.low, "low"],
                ] as const
              ).map(([label, n, tone]) => (
                <div
                  key={label}
                  className={cn("min-w-[82px] rounded-md border px-3.5 py-2", STAT_TONES[tone])}
                >
                  <div className="label-xs opacity-80">{label} gaps</div>
                  <div className="data-mono mt-0.5 text-[18px] leading-none font-semibold">{n}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <SearchConsole companies={companies} />
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="mx-auto max-w-[1600px] fluid-px pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-strong pb-2">
          <h2 className="data-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground">
            Scanned prospects
          </h2>

          <div className="flex items-center gap-1.5">
            <span className="label-xs">Service line</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="border border-border-strong bg-surface px-1.5 py-1 data-mono text-[10px] uppercase text-foreground outline-none focus:border-primary/70"
            >
              <option value="all">all</option>
              {GND_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="label-xs">Has severity</span>
            {(["all", "high", "medium"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMinSev(s === "all" ? "all" : (s as Severity))}
                className={cn(
                  "border px-1.5 py-1 data-mono text-[10px] uppercase",
                  minSev === s
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border-strong text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="label-xs">Sort</span>
            {(
              [
                ["risk", "risk"],
                ["recent", "recent"],
                ["name", "a–z"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={cn(
                  "border px-1.5 py-1 data-mono text-[10px] uppercase",
                  sort === key
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border-strong text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto pb-16">
          <table className="w-full min-w-[900px] table-fixed border-collapse">
            {/* Explicit column widths (not left to content) -- otherwise the
                browser's default auto table-layout gives whichever cell has
                the longest unbroken word its own width per row, which is what
                made HQ/Founded/Size look wildly uneven and forced the table
                wider than the viewport at 100% zoom. */}
            <colgroup>
              <col className="w-6" />
              <col className="w-[17%]" />
              <col className="w-[19%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-14" />
              <col className="w-24" />
              <col className="w-16" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                {["", "Company", "Industry", "HQ", "Founded", "Size", "Facts", "Gaps H/M/L", ""].map(
                  (h, i) => (
                    <th key={i} className="label-xs cell-pad text-left font-normal whitespace-nowrap">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const counts = severityCount(c);
                const worst = counts.high > 0 ? "high" : counts.medium > 0 ? "medium" : "low";
                return (
                  <tr
                    key={c.slug}
                    className={cn(
                      "group border-b border-border transition-all hover:shadow-[0_2px_10px_-5px_rgba(0,0,0,0.4)] hover:relative",
                      ROW_TONES[worst],
                    )}
                  >
                    <td className="cell-pad">
                      <span className={cn("block h-5 w-1", BAR_TONES[worst])} />
                    </td>
                    <td className="cell-pad">
                      <Link
                        to="/company/$slug"
                        params={{ slug: c.slug }}
                        className="line-clamp-2 text-[13.5px] font-medium text-foreground group-hover:text-primary"
                      >
                        {c.company_name}
                      </Link>
                      <div className="data-mono text-[10px] text-stamp">
                        #{String(i + 1).padStart(2, "0")} · scanned {c.scanned_at}
                      </div>
                    </td>
                    <td className="cell-pad overflow-hidden text-[12px] text-muted-foreground" title={c.industry}>
                      <span className="line-clamp-2">{c.industry}</span>
                    </td>
                    <td className="cell-pad truncate data-mono text-[11.5px] text-muted-foreground" title={c.hq}>
                      {c.hq}
                    </td>
                    <td
                      className="cell-pad truncate data-mono text-[11.5px] text-muted-foreground"
                      title={c.founded}
                    >
                      {c.founded}
                    </td>
                    <td className="cell-pad truncate text-[11.5px] text-muted-foreground" title={c.size}>
                      {c.size}
                    </td>
                    <td className="cell-pad data-mono text-[11.5px] text-foreground">{c.facts.length}</td>
                    <td className="cell-pad">
                      <SeverityTally counts={counts} />
                    </td>
                    <td className="cell-pad text-right">
                      <Link
                        to="/company/$slug"
                        params={{ slug: c.slug }}
                        className="data-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground group-hover:text-primary"
                      >
                        open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="cell-pad py-8 data-mono text-[12px] text-muted-foreground">
                    No prospects match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
