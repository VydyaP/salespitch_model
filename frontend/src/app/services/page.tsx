import AppLayout from '@/components/AppLayout';
import ServicesContent from './components/ServicesContent';
import { fetchCompanies } from '@/lib/api';

export default async function ServicesPage() {
  const companies = await fetchCompanies().catch(() => []);

  return (
    <AppLayout>
      <ServicesContent companies={companies} />
    </AppLayout>
  );
}
