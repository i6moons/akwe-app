import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { MembresListeScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <MembresListeScreen />
    </Suspense>
  );
}
