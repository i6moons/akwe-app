'use client';

import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { DraftSummary } from '@/components/operation/draft-summary';
import { OfflineNotice } from '@/components/layout/offline-notice';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { Card } from '@/components/ui/card';
import { createTransaction } from '@/lib/db/repository';
import { clearDraft } from '@/lib/operations/draft-store';
import { formatDateLong } from '@/lib/format';
import type { OperationDraft, Transaction } from '@/lib/types';

/** Maquette « iPhone 17 - 19 » — l'humaine valide ce que l'IA propose. */
export function ConfirmStep({
  draft,
  onEdit,
  onSaved,
}: {
  draft: OperationDraft;
  onEdit: () => void;
  onSaved: (transaction: Transaction) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      // L'écriture va dans IndexedDB puis dans la file de sync : elle aboutit
      // que le réseau soit là ou non.
      const transaction = await createTransaction(draft);
      clearDraft();
      onSaved(transaction);
    } catch {
      setError("L'opération n'a pas pu être enregistrée. Réessayez.");
      setSaving(false);
    }
  }

  return (
    <main className="safe-bottom min-h-dvh pb-8">
      <AppHeader title="Confirmation de donnée" centered />

      <div className="px-4 pt-6">
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={draft.memberName ?? '?'} size="lg" />
            <div className="min-w-0">
              <p className="text-brand-800 truncate text-lg font-bold">
                {draft.memberName ?? 'Membre à préciser'}
              </p>
              <p className="text-brand-700/80 text-xs">{formatDateLong(draft.occurredAt)}</p>
            </div>
          </div>

          <DraftSummary draft={draft} />
          <OfflineNotice />

          {error ? (
            <p role="alert" className="text-danger-500 text-sm font-medium">
              {error}
            </p>
          ) : null}
        </Card>
      </div>

      <FixedAction>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outlineLight" onClick={onEdit} disabled={saving}>
            <Pencil className="size-5" aria-hidden />
            Modifier
          </Button>
          <Button
            onClick={() => void handleValidate()}
            loading={saving}
            disabled={draft.amount === null || draft.memberId === null}
          >
            {saving ? null : <Check className="size-5" aria-hidden />}
            {saving ? 'Enregistrement…' : 'Valider'}
          </Button>
        </div>
      </FixedAction>
    </main>
  );
}
