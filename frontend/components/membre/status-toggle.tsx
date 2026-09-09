'use client';

import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { m } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

const ETATS = [
  { valeur: true, libellé: '✓ Actif' },
  { valeur: false, libellé: 'Inactif' },
] as const;

/**
 * Actif / inactif, avec un curseur qui glisse d'un état à l'autre.
 * Désactiver un membre le retire des listes et des prochaines cotisations :
 * on demande confirmation avant, jamais après.
 */
export function StatusToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const [confirmation, setConfirmation] = useState(false);

  function choisir(suivant: boolean): void {
    if (!suivant && value) {
      setConfirmation(true);
      return;
    }
    onChange(suivant);
  }

  return (
    <>
      <div className="border-accent-500 flex gap-1 rounded-full border p-1" role="group">
        {ETATS.map(({ valeur, libellé }) => (
          <button
            key={String(valeur)}
            type="button"
            aria-pressed={value === valeur}
            onClick={() => choisir(valeur)}
            className={cn(
              'min-h-touch relative flex-1 rounded-full font-semibold',
              value === valeur ? 'text-brand-950' : 'text-brand-700',
            )}
          >
            {value === valeur ? (
              // `layoutId` fait glisser le fond entre les deux boutons plutôt
              // que de le faire disparaître d'un côté et réapparaître de l'autre.
              <m.span
                layoutId="curseur-statut"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-accent-500 absolute inset-0 rounded-full"
              />
            ) : null}
            <span className="relative">{libellé}</span>
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={confirmation}
        title="Désactiver ce membre ?"
        description="Il n'apparaîtra plus dans la liste des membres actifs ni dans les prochaines cotisations. Vous pourrez le réactiver plus tard."
        confirmLabel="Désactiver"
        icon={<UserMinus className="size-8" aria-hidden />}
        onCancel={() => setConfirmation(false)}
        onConfirm={() => {
          onChange(false);
          setConfirmation(false);
        }}
      />
    </>
  );
}
