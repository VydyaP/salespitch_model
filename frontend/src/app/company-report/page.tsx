import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import CompanyReportContent from './components/CompanyReportContent';
import { fetchCompanies, fetchCompanyBySlug } from '@/lib/api';

export default async function CompanyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [company, companies] = await Promise.all([
    id ? fetchCompanyBySlug(id) : Promise.resolve(undefined),
    fetchCompanies().catch(() => []),
  ]);

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center">Loading report…</div>}>
        <CompanyReportContent company={company} companies={companies} />
      </Suspense>
    </AppLayout>
  );
}
