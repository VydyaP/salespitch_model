import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/scan/ThemeToggle";

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid size-5 place-items-center border border-primary/70 text-primary">
            <span className="size-1.5 bg-primary" />
          </span>
          <span className="data-mono text-[12px] font-semibold tracking-[0.18em] uppercase text-foreground group-hover:text-primary">
            Prospect Scan
          </span>
        </Link>
        <span className="hidden text-[10px] label-xs sm:inline">
          GND Solutions · Internal sales research
        </span>
        <div className="ml-auto flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
