export type Severity = "high" | "medium" | "low";

export const GND_SERVICES = [
  "Cold Chain Management",
  "Warehouse Management",
  "Asset Tracking & Monitoring",
  "Product Engineering",
  "Platform",
] as const;

export type GndService = (typeof GND_SERVICES)[number];

export interface Fact {
  claim: string;
  source_snippet: string;
  source_url: string;
}

export type VerificationStatus = "VERIFIED" | "WEAK" | "UNVERIFIED";

export interface Gap {
  title: string;
  detail: string;
  severity: Severity;
  gnd_service: GndService;
  based_on: string;
  // Computed by verify.py, a deterministic word-overlap check against the
  // sourced facts -- null when no verification run exists for this gap.
  verification_status?: VerificationStatus | null;
}

export interface Pitch {
  angle: string;
  opener: string;
}

export interface Company {
  slug: string;
  company_name: string;
  founded: string;
  hq: string;
  country: string;
  industry: string;
  size: string;
  scanned_at: string;
  website: string;
  linkedin_url: string;
  phone: string;
  facts: Fact[];
  gaps: Gap[];
  pitch: Pitch;
}

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");


export const severityCount = (company: Company) => ({
  high: company.gaps.filter((g) => g.severity === "high").length,
  medium: company.gaps.filter((g) => g.severity === "medium").length,
  low: company.gaps.filter((g) => g.severity === "low").length,
});
