import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { CaisseDetailScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <CaisseDetailScreen />
    </Suspense>
  );
}
