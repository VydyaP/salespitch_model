import AppLayout from '@/components/AppLayout';
import DirectoryContent from './components/DirectoryContent';
import { fetchCompanies } from '@/lib/api';

export default async function CompanyDirectoryPage() {
  const companies = await fetchCompanies().catch(() => []);

  return (
    <AppLayout>
      <DirectoryContent companies={companies} />
    </AppLayout>
  );
}
