'use client';

import { OperationFlow } from '@/components/operation/operation-flow';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId } from '@/lib/hooks/use-params';

export function SaisieVocaleScreen() {
  const id = useCaisseId();
  if (!id) return <MissingParam />;
  return <OperationFlow groupId={id} mode="voice" />;
}
