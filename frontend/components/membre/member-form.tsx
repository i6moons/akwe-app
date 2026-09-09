'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Info, User } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BareInput, Field, IconField, Input } from '@/components/ui/field';
import { formatPhone, toDateInput } from '@/lib/format';

export interface MemberFormValues {
  fullName: string;
  phone: string;
  joinedAt: string;
  isActive: boolean;
}

/** Formulaire partagé entre l'ajout et la modification d'un membre. */
export function MemberForm({
  initial,
  submitLabel,
  submitIcon,
  showStatus = false,
  onSubmit,
}: {
  initial?: Partial<MemberFormValues>;
  submitLabel: string;
  submitIcon?: ReactNode;
  showStatus?: boolean;
  onSubmit: (values: MemberFormValues) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [phone, setPhone] = useState(initial?.phone ? formatPhone(initial.phone) : '');
  const [joinedAt, setJoinedAt] = useState(toDateInput(initial?.joinedAt ?? new Date()));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (fullName.trim().length < 2) {
      setError('Entrez le nom complet du membre.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, ''),
        joinedAt,
        isActive,
      });
    } catch {
      setError("L'enregistrement a échoué. Réessayez.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-1 flex-col px-4">
      <Card className="space-y-5">
        <CardTitle className="text-base">Informations</CardTitle>

        <Field label="Nom complet" htmlFor="nom-membre" required error={error}>
          <IconField icon={<User className="size-5" aria-hidden />}>
            <BareInput
              id="nom-membre"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Exemple: Josué DADJO"
              autoComplete="name"
            />
          </IconField>
        </Field>

        <Field label="Numéro de téléphone" htmlFor="tel-membre">
          <IconField icon={<span className="text-sm font-medium">+229</span>}>
            <BareInput
              id="tel-membre"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              placeholder="Numéro de téléphone"
            />
          </IconField>
        </Field>

        <div className="bg-surface-2 flex gap-3 rounded-xl p-3">
          <Info className="text-brand-600 size-5 shrink-0" aria-hidden />
          <p className="text-brand-700/80 text-xs">
            Le numéro est facultatif. Sans numéro, ce membre ne pourra pas recevoir de reçus par
            WhatsApp ou SMS.
          </p>
        </div>

        <Field label="Date d'entrée" htmlFor="date-membre">
          <Input
            id="date-membre"
            type="date"
            value={joinedAt}
            onChange={(event) => setJoinedAt(event.target.value)}
          />
        </Field>

        {showStatus ? <StatusToggle value={isActive} onChange={setIsActive} /> : null}
      </Card>

      <div className="mt-auto pt-8">
        <Button type="submit" size="lg" disabled={saving}>
          {submitIcon}
          {saving ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function StatusToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="border-accent-500 flex gap-1 rounded-full border p-1" role="group">
      {[true, false].map((state) => (
        <button
          key={String(state)}
          type="button"
          aria-pressed={value === state}
          onClick={() => onChange(state)}
          className={
            value === state
              ? 'bg-accent-500 text-brand-950 min-h-touch flex-1 rounded-full font-semibold'
              : 'text-brand-700 min-h-touch flex-1 rounded-full font-semibold'
          }
        >
          {state ? '✓ Actif' : 'Inactif'}
        </button>
      ))}
    </div>
  );
}
