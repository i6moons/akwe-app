import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { SaisieManuelleScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback title="Saisir manuelle d'une opération" />}>
      <SaisieManuelleScreen />
    </Suspense>
  );
}
