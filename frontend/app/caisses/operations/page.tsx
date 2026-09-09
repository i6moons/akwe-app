import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { HistoriqueScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <HistoriqueScreen />
    </Suspense>
  );
}
