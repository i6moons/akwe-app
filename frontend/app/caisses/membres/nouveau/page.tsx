import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { NouveauMembreScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <NouveauMembreScreen />
    </Suspense>
  );
}
