import type { Company } from "@/data/companies";

// The Flask backend always runs on :5000 in local dev; the Vite frontend
// runs on :8080. Two different ports means an explicit origin is needed
// here (relative fetches would hit the frontend's own dev server).
// Deliberately 127.0.0.1, not "localhost" -- this app does SSR, and
// Node's fetch can resolve "localhost" to the IPv6 loopback (::1) first,
// which Flask's app.run(host="127.0.0.1", ...) never binds to. That
// silently fails every server-side fetch (client-side fetch in the
// browser isn't affected, but SSR is what breaks).
const API_BASE = "http://127.0.0.1:5000";

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/api/companies`);
  if (!res.ok) throw new Error(`Failed to load companies (${res.status})`);
  const data = await res.json();
  return data.companies as Company[];
}

export async function fetchCompanyBySlug(slug: string): Promise<Company | undefined> {
  const res = await fetch(`${API_BASE}/api/companies/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Failed to load company (${res.status})`);
  return (await res.json()) as Company;
}

export interface SuggestItem {
  name: string;
  slug?: string;
  domain?: string;
  source: "corpus" | "new";
}

export async function fetchSuggestions(query: string): Promise<SuggestItem[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/api/suggest?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as SuggestItem[];
}

export function openScanStream(company: string): EventSource {
  return new EventSource(`${API_BASE}/api/scan/research?company=${encodeURIComponent(company)}`);
}

export function openScanContinueStream(company: string): EventSource {
  return new EventSource(`${API_BASE}/api/scan/continue?company=${encodeURIComponent(company)}`);
}

export async function cancelScan(company: string): Promise<void> {
  await fetch(`${API_BASE}/api/scan/cancel?company=${encodeURIComponent(company)}`, {
    method: "POST",
  });
}

export async function saveCompany(slug: string): Promise<void> {
  await fetch(`${API_BASE}/api/save?slug=${encodeURIComponent(slug)}`, { method: "POST" });
}

export async function discardCompany(slug: string): Promise<void> {
  await fetch(`${API_BASE}/api/discard?slug=${encodeURIComponent(slug)}`, { method: "POST" });
}

export { API_BASE };
