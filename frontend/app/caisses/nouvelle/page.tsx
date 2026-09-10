'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { Field, FieldError } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { OfflineNotice } from '@/components/layout/offline-notice';
import { useToast } from '@/components/ui/toast';
import { useFormErrors } from '@/lib/hooks/use-form-errors';
import { createGroup } from '@/lib/db/repository';
import { parseAmount } from '@/lib/format';
import { FREQUENCY_LABELS, type Frequency } from '@/lib/types';
import { routes } from '@/lib/routes';

const CHAMP = '!h-[43px] !min-h-[43px] !rounded-[6px] border border-brand-600 !bg-transparent';

/** Maquette « iPhone 17 - 6 » — création d'une caisse. */
export default function NouvelleCaissePage() {
  const router = useRouter();
  const notify = useToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const form = useFormErrors({
    name: () => (name.trim().length < 3 ? 'Donnez un nom à votre caisse.' : null),
    amount: () =>
      parseAmount(amount) === null ? 'Entrez un montant en FCFA, par exemple 2000.' : null,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const contribution = parseAmount(amount);
    if (!form.valider() || contribution === null) return;

    setSaving(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        contributionAmount: contribution,
        frequency,
        location: location.trim() || 'Non précisé',
      });
      notify('success', `Caisse « ${group.name} » créée`);
      router.replace(routes.membres(group.id));
    } catch {
      const message = "La caisse n'a pas pu être enregistrée. Réessayez.";
      form.setFormError(message);
      notify('error', message);
      setSaving(false);
    }
  }

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader title="Création d'une caisse" centered />

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-1 flex-col px-4 pt-10 lg:mx-auto lg:w-full lg:max-w-2xl"
      >
        <Card className="space-y-6">
          <CardTitle className="text-base">Informations</CardTitle>

          <Field label="Nom de la caisse" htmlFor="nom" error={form.error('name')}>
            <Input
              id="nom"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                form.effacer('name');
              }}
              onBlur={form.blur('name')}
              placeholder="Exemple : Tontine voyage yémèli"
              autoComplete="off"
              className={CHAMP}
            />
          </Field>

          <Field
            label="Montant de la cotisation"
            htmlFor="montant"
            required
            error={form.error('amount')}
          >
            <Input
              id="montant"
              inputMode="numeric"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                form.effacer('amount');
              }}
              onBlur={form.blur('amount')}
              placeholder="Exemple : 2000"
              className={CHAMP}
            />
          </Field>

          <Field label="Fréquence de tontine" htmlFor="frequence">
            <Select
              id="frequence"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
              className={CHAMP}
            >
              {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((value) => (
                <option key={value} value={value}>
                  Par {FREQUENCY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Lieu" htmlFor="lieu">
            <Input
              id="lieu"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Exemple : calavi kpotà"
              autoComplete="off"
              className={CHAMP}
            />
          </Field>

          <OfflineNotice />
          <FieldError message={form.formError} />
        </Card>

        <FixedAction>
          <Button type="submit" size="lg" loading={saving}>
            {saving ? null : <Plus className="size-5" aria-hidden />}
            {saving ? 'Enregistrement…' : 'Créer la caisse'}
          </Button>
        </FixedAction>
      </form>
    </main>
  );
}
