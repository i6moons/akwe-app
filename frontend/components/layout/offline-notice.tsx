'use client';

import { CloudOff, Info, RefreshCw } from 'lucide-react';
import { useSync } from '@/lib/hooks/use-sync';

/**
 * Bandeau jaune des maquettes, affiché sur les écrans de confirmation.
 * Il explique ce qui va se passer plutôt que de signaler une panne : hors ligne
 * est un mode de fonctionnement normal, pas une erreur.
 */
export function OfflineNotice() {
  const { online } = useSync();
  if (online) return null;

  return (
    <div className="bg-warn-100 flex gap-3 rounded-xl p-3">
      <Info className="text-warn-500 size-5 shrink-0" aria-hidden />
      <div className="text-brand-800 text-sm">
        <p className="font-semibold">Vous êtes actuellement hors connexion</p>
        <p className="text-brand-700/70">
          L&apos;opération sera enregistrée sur votre appareil et synchronisée dès que la connexion
          sera de retour.
        </p>
      </div>
    </div>
  );
}

/**
 * Pastille permanente : état du réseau et nombre d'opérations en attente.
 * Elle disparaît dès que tout est remonté — c'est le repère visuel de la démo
 * quand on rebranche la connexion.
 */
export function SyncIndicator() {
  const { online, pending, syncing, flush } = useSync();

  if (online && pending === 0) return null;

  const plural = pending > 1 ? 's' : '';
  const message = online
    ? `${pending} opération${plural} en cours de synchronisation`
    : pending === 0
      ? 'Hors connexion — vos saisies seront conservées'
      : `Hors connexion — ${pending} opération${plural} en attente`;

  return (
    <button
      type="button"
      onClick={() => void flush()}
      disabled={!online || syncing}
      className="min-h-touch bg-brand-700 flex w-full items-center gap-3 rounded-xl px-4 text-left text-white"
    >
      {online ? (
        <RefreshCw className={syncing ? 'size-5 animate-spin' : 'size-5'} aria-hidden />
      ) : (
        <CloudOff className="size-5" aria-hidden />
      )}
      <span className="flex-1 text-sm">{message}</span>
    </button>
  );
}
