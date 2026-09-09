'use client';

import { useState, type FormEvent } from 'react';
import { CalendarDays, Save, User } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { TypePicker } from '@/components/operation/type-picker';
import { OfflineNotice } from '@/components/layout/offline-notice';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BareInput, Field, IconField, Select } from '@/components/ui/field';
import { SkeletonList } from '@/components/ui/states';
import { useMembers } from '@/lib/hooks/use-akwe';
import { parseAmount, toDateInput } from '@/lib/format';
import type { OperationDraft, TransactionType } from '@/lib/types';

/** Maquette « iPhone 17 - 18 » — saisie manuelle, le filet de sécurité de la démo. */
export function ManualStep({
  groupId,
  initial,
  onReady,
}: {
  groupId: string;
  initial: OperationDraft | null;
  onReady: (draft: OperationDraft) => void;
}) {
  const members = useMembers(groupId);

  const [memberId, setMemberId] = useState(initial?.memberId ?? '');
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'contribution');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [date, setDate] = useState(
    toDateInput(initial ? new Date(initial.occurredAt) : new Date()),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = parseAmount(amount);
    const nextErrors: Record<string, string> = {};
    if (!memberId) nextErrors.member = 'Choisissez le membre concerné.';
    if (parsed === null) nextErrors.amount = 'Entrez un montant en FCFA, par exemple 2000.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || parsed === null) return;

    const member = members?.find((item) => item.id === memberId) ?? null;
    onReady({
      groupId,
      memberId,
      memberName: member?.fullName ?? null,
      amount: parsed,
      type,
      occurredAt: new Date(date).toISOString(),
      source: 'manual',
      rawTranscript: null,
      confidence: null,
    });
  }

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader title="Saisir manuelle d'une opération" centered />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-4">
        <Card className="space-y-5">
          <Field label="Membre" htmlFor="membre" required error={errors.member}>
            {members === undefined ? (
              <SkeletonList rows={1} />
            ) : (
              <IconField icon={<User className="size-5" aria-hidden />}>
                <Select
                  id="membre"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                  className="rounded-none border-0"
                >
                  <option value="">Sélectionner un membre</option>
                  {members
                    .filter((member) => member.isActive)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                </Select>
              </IconField>
            )}
          </Field>

          <div className="space-y-2">
            <p className="font-display text-brand-800 font-semibold">
              Type d&apos;opération<span className="text-danger-500"> *</span>
            </p>
            <TypePicker value={type} onChange={setType} />
          </div>

          <Field label="Montant" htmlFor="montant" required error={errors.amount}>
            <IconField suffix="FCFA">
              <BareInput
                id="montant"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ex : 2000"
              />
            </IconField>
          </Field>

          <Field label="Date" htmlFor="date" required>
            <IconField icon={<CalendarDays className="size-5" aria-hidden />}>
              <BareInput
                id="date"
                type="date"
                value={date}
                max={toDateInput(new Date())}
                onChange={(event) => setDate(event.target.value)}
              />
            </IconField>
          </Field>

          <OfflineNotice />
        </Card>

        <div className="mt-auto pt-8">
          <Button type="submit" size="lg">
            <Save className="size-5" aria-hidden />
            Enregistrer
          </Button>
        </div>
      </form>
    </main>
  );
}
