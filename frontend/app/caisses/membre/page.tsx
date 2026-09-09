import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { FicheMembreScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <FicheMembreScreen />
    </Suspense>
  );
}
