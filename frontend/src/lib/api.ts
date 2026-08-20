import type { Company, Fact, Gap } from '@/lib/mockData';

// All fetching in this app happens from client components ('use client'),
// so this always runs in the browser -- no SSR IPv6/localhost gotcha here,
// but 127.0.0.1 is kept explicit for consistency with the backend's bind address.
const API_BASE = 'http://127.0.0.1:5000';

// Shape returned by server.py's /api/companies -- close to but not
// identical to this app's Company type (slug vs id, scanned_at vs
// researched_at, no per-item ids on facts/gaps, based_on is the fact's
// claim text rather than a resolved id). adaptCompany() bridges the two
// so the rest of the app (built against mockData's Company shape) never
// has to know about the raw backend shape.
interface RawFact {
  claim: string;
  source_snippet: string;
  source_url: string;
}

interface RawGap {
  title: string;
  detail: string;
  severity: Gap['severity'];
  gnd_service: Gap['gnd_service'];
  based_on: string;
  verification_status?: Gap['verification_status'];
}

interface RawCompany {
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
  facts: RawFact[];
  gaps: RawGap[];
  pitch: { angle: string; opener: string };
}

function adaptCompany(raw: RawCompany): Company {
  const facts: Fact[] = raw.facts.map((f, i) => ({
    id: `${raw.slug}-f${i}`,
    claim: f.claim,
    source_snippet: f.source_snippet,
    source_url: f.source_url,
  }));

  const factIdByClaim = new Map(facts.map((f) => [f.claim, f.id]));

  const gaps: Gap[] = raw.gaps.map((g, i) => ({
    id: `${raw.slug}-g${i}`,
    title: g.title,
    detail: g.detail,
    severity: g.severity,
    gnd_service: g.gnd_service,
    based_on_fact_id: factIdByClaim.get(g.based_on) ?? '',
    verification_status: g.verification_status ?? null,
  }));

  return {
    id: raw.slug,
    company_name: raw.company_name,
    founded: raw.founded,
    hq: raw.hq,
    industry: raw.industry,
    size: raw.size,
    website: raw.website,
    linkedin_url: raw.linkedin_url,
    phone: raw.phone,
    researched_at: raw.scanned_at,
    facts,
    gaps,
    pitch: raw.pitch,
  };
}

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/api/companies`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load companies (${res.status})`);
  const data = await res.json();
  return (data.companies as RawCompany[]).map(adaptCompany);
}

export async function fetchCompanyBySlug(slug: string): Promise<Company | undefined> {
  const res = await fetch(`${API_BASE}/api/companies/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Failed to load company (${res.status})`);
  return adaptCompany((await res.json()) as RawCompany);
}

export interface SuggestItem {
  name: string;
  slug?: string;
  domain?: string;
  source: 'corpus' | 'new';
}

export async function fetchSuggestions(query: string): Promise<SuggestItem[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/api/suggest?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as SuggestItem[];
}

export function openScanStream(company: string, force = false): EventSource {
  const forceParam = force ? '&force=1' : '';
  return new EventSource(
    `${API_BASE}/api/scan/research?company=${encodeURIComponent(company)}${forceParam}`
  );
}

export function openScanContinueStream(company: string, force = false): EventSource {
  const forceParam = force ? '&force=1' : '';
  return new EventSource(
    `${API_BASE}/api/scan/continue?company=${encodeURIComponent(company)}${forceParam}`
  );
}

export async function cancelScan(company: string): Promise<void> {
  await fetch(`${API_BASE}/api/scan/cancel?company=${encodeURIComponent(company)}`, {
    method: 'POST',
  });
}

export async function saveCompany(slug: string): Promise<void> {
  await fetch(`${API_BASE}/api/save?slug=${encodeURIComponent(slug)}`, { method: 'POST' });
}

export async function discardCompany(slug: string): Promise<void> {
  await fetch(`${API_BASE}/api/discard?slug=${encodeURIComponent(slug)}`, { method: 'POST' });
}

export { API_BASE };
