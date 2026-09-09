'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Info, User } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { StatusToggle } from '@/components/membre/status-toggle';
import { useToast } from '@/components/ui/toast';
import { useFormErrors } from '@/lib/hooks/use-form-errors';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { Field, FieldError } from '@/components/ui/field';
import { BareInput, IconField, Input } from '@/components/ui/input';
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
  const [saving, setSaving] = useState(false);
  const notify = useToast();

  const form = useFormErrors({
    fullName: () => (fullName.trim().length < 2 ? 'Entrez le nom complet du membre.' : null),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form.valider()) return;

    setSaving(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, ''),
        joinedAt,
        isActive,
      });
      notify('success', `${fullName.trim()} enregistré`);
    } catch {
      const message = "L'enregistrement a échoué. Réessayez.";
      form.setFormError(message);
      notify('error', message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-1 flex-col px-4">
      <Card className="space-y-5">
        <CardTitle className="text-base">Informations</CardTitle>

        <Field label="Nom complet" htmlFor="nom-membre" required error={form.error('fullName')}>
          <IconField icon={<User className="size-5" aria-hidden />}>
            <BareInput
              id="nom-membre"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                form.effacer('fullName');
              }}
              onBlur={form.blur('fullName')}
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

        <FieldError message={form.formError} />
      </Card>

      <FixedAction>
        <Button type="submit" size="lg" loading={saving}>
          {saving ? null : submitIcon}
          {saving ? 'Enregistrement…' : submitLabel}
        </Button>
      </FixedAction>
    </form>
  );
}
