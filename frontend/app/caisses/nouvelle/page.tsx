'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { OfflineNotice } from '@/components/layout/offline-notice';
import { createGroup } from '@/lib/db/repository';
import { parseAmount } from '@/lib/format';
import { FREQUENCY_LABELS, type Frequency } from '@/lib/types';
import { routes } from '@/lib/routes';

/** Maquette « iPhone 17 - 6 » — création d'une caisse. */
export default function NouvelleCaissePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const contribution = parseAmount(amount);
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 3) nextErrors.name = 'Donnez un nom à votre caisse.';
    if (contribution === null) nextErrors.amount = 'Entrez un montant en FCFA, par exemple 2000.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || contribution === null) return;

    setSaving(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        contributionAmount: contribution,
        frequency,
        location: location.trim() || 'Non précisé',
      });
      router.replace(routes.membres(group.id));
    } catch {
      setErrors({ form: "La caisse n'a pas pu être enregistrée. Réessayez." });
      setSaving(false);
    }
  }

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader title="Création d'une caisse" centered />

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-1 flex-col px-4">
        <Card className="space-y-5">
          <CardTitle className="text-base">Informations</CardTitle>

          <Field label="Nom de la caisse" htmlFor="nom" required error={errors.name}>
            <Input
              id="nom"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Exemple : Tontine voyage yèmi"
              autoComplete="off"
            />
          </Field>

          <Field label="Montant de la cotisation" htmlFor="montant" required error={errors.amount}>
            <Input
              id="montant"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Exemple : 2000"
            />
          </Field>

          <Field label="Fréquence de tontine" htmlFor="frequence">
            <Select
              id="frequence"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
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
              placeholder="Exemple : Calavi kpota"
              autoComplete="off"
            />
          </Field>

          <OfflineNotice />

          {errors.form ? (
            <p role="alert" className="text-danger-500 text-sm font-medium">
              {errors.form}
            </p>
          ) : null}
        </Card>

        <div className="mt-auto pt-8">
          <Button type="submit" size="lg" disabled={saving}>
            <Plus className="size-5" aria-hidden />
            {saving ? 'Enregistrement…' : 'Créer la caisse'}
          </Button>
        </div>
      </form>
    </main>
  );
}
