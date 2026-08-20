import { useSyncExternalStore } from "react";
import type { Company } from "@/data/companies";

// Holds ONLY companies found+saved via live search this session -- NOT
// the full backend list (that comes from the "/" route's loader via
// Route.useLoaderData(), see routes/index.tsx, and gets merged with this
// store's contents there). Kept deliberately separate: a loader's result
// is available synchronously on first render, server and client alike;
// this store exists for the one thing a loader can't do -- react to a
// user action (Save) that happens well after the initial render.
let companies: Company[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const scanStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get() {
    return companies;
  },
  publish(company: Company) {
    if (companies.some((c) => c.slug === company.slug)) return;
    companies = [company, ...companies];
    emit();
  },
};

export function useCompanies() {
  return useSyncExternalStore(
    scanStore.subscribe,
    scanStore.get,
    () => [] as Company[],
  );
}
