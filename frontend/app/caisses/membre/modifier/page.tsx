import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { ModifierMembreScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <ModifierMembreScreen />
    </Suspense>
  );
}
