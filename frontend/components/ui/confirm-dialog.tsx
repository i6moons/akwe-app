'use client';

import { useState, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

/**
 * Confirmation avant une action qu'on ne peut pas défaire.
 *
 * Remplace `window.confirm`, qui affiche l'adresse du site en français
 * approximatif et ne se traduit pas. Ici le texte est le nôtre.
 */
export function ConfirmDialog({
  open,
  title = 'Êtes-vous sûre ?',
  description = 'Cette action est irréversible.',
  confirmLabel = 'Confirmer',
  icon,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  icon?: ReactNode;
  /** Peut être asynchrone : le bouton reste en chargement le temps voulu. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [enCours, setEnCours] = useState(false);

  async function confirmer(): Promise<void> {
    setEnCours(true);
    try {
      await onConfirm();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={enCours ? () => undefined : onCancel}
      side="bottom"
      label={title}
      // Plein écran par le bas sur téléphone, boîte centrée sur grand écran.
      className="bg-surface w-full rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-auto sm:max-w-md sm:rounded-2xl sm:pb-5"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-danger-100 text-danger-500 flex size-16 items-center justify-center rounded-full">
          {icon ?? <TriangleAlert className="size-8" aria-hidden />}
        </span>
        <p className="text-brand-800 font-display text-lg">{title}</p>
        <p className="text-brand-700/80 text-sm">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-6">
        <Button variant="outline" onClick={onCancel} disabled={enCours}>
          Annuler
        </Button>
        <Button variant="danger" loading={enCours} onClick={() => void confirmer()}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
