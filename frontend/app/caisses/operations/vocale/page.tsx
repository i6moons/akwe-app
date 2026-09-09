import { Suspense } from 'react';
import { ScreenFallback } from '@/components/layout/screen-states';
import { SaisieVocaleScreen } from './screen';

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback title="Enregistrer une opération" />}>
      <SaisieVocaleScreen />
    </Suspense>
  );
}
