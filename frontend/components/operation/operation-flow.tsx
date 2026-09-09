'use client';

import { useState } from 'react';
import { ManualStep } from '@/components/operation/manual-step';
import { VoiceStep } from '@/components/operation/voice-step';
import { ConfirmStep } from '@/components/operation/confirm-step';
import { SuccessStep } from '@/components/operation/success-step';
import { saveDraft } from '@/lib/operations/draft-store';
import type { OperationDraft, Transaction } from '@/lib/types';

/**
 * Saisie → confirmation → succès, en un seul écran.
 *
 * Ces trois étapes étaient trois adresses distinctes. Next.js va chercher le
 * code d'une page au moment où l'on y navigue : hors connexion, la trésorière
 * validait sa cotisation et tombait sur « vous êtes hors connexion ». En gardant
 * les étapes dans la même page, plus une seule requête réseau entre le moment où
 * elle parle et celui où elle voit son reçu.
 */
export function OperationFlow({ groupId, mode }: { groupId: string; mode: 'manual' | 'voice' }) {
  const [draft, setDraft] = useState<OperationDraft | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState<Transaction | null>(null);

  if (saved) return <SuccessStep groupId={groupId} transaction={saved} />;

  if (draft && confirming) {
    return <ConfirmStep draft={draft} onEdit={() => setConfirming(false)} onSaved={setSaved} />;
  }

  function handleReady(next: OperationDraft): void {
    // Conservé en session : si l'appareil s'éteint entre la dictée et la
    // validation, la saisie est toujours là au rallumage.
    saveDraft(next);
    setDraft(next);
    setConfirming(true);
  }

  // Après « Modifier », on repasse par le formulaire même si la dictée était le
  // point de départ : c'est là qu'on peut corriger un nom ou un montant.
  if (mode === 'voice' && !draft) {
    return <VoiceStep groupId={groupId} onReady={handleReady} />;
  }

  return <ManualStep groupId={groupId} initial={draft} onReady={handleReady} />;
}
