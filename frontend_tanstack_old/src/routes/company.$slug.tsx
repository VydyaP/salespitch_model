import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CompanyReport } from "@/components/scan/CompanyReport";
import { TopBar } from "@/components/scan/TopBar";
import { scanStore } from "@/lib/scan-store";
import { fetchCompanyBySlug } from "@/lib/api";

export const Route = createFileRoute("/company/$slug")({
  loader: async ({ params }) => {
    // Already-loaded list covers the common case (came from "/"); direct
    // navigation or a page refresh won't have that populated yet, so fall
    // back to fetching this one company straight from the real backend.
    const fromStore = scanStore.get().find((c) => c.slug === params.slug);
    const company = fromStore ?? (await fetchCompanyBySlug(params.slug));
    if (!company) throw notFound();
    return { company };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.company.company_name ?? "Prospect dossier";
    const desc = `Sourced facts, operational gaps and a pitch angle for ${name} — Prospect Scan gap analysis for GND Solutions sales calls.`;
    return {
      meta: [
        { title: `${name} — Prospect Scan dossier` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — Prospect Scan dossier` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CompanyPage,
});

function CompanyPage() {
  const { company } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <TopBar
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 data-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="size-3" /> All prospects
            </Link>
          </div>
        }
      />
      <CompanyReport company={company} />
    </div>
  );
}
