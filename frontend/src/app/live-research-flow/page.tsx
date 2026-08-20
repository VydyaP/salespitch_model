import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import LiveResearchContent from './components/LiveResearchContent';

export default function LiveResearchFlowPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
        <LiveResearchContent />
      </Suspense>
    </AppLayout>
  );
}
