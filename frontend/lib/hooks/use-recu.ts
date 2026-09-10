'use client';

import { useEffect, useState } from 'react';
import { getDb } from '@/lib/db/schema';
import { formatDateLong, formatSigned } from '@/lib/format';
import { directionOf, operationMeta, type Transaction } from '@/lib/types';
import { genererRecuPng, type DonneesRecu } from '@/lib/recu/image';
import { getSession } from '@/lib/auth/session';

export const SOURCE_LABELS = {
  voice: 'Saisie vocale',
  manual: 'Saisie manuelle',
  payment_webhook: 'Mobile money',
} as const;

export interface Recu {
  donnees: DonneesRecu | null;
  /** Le PNG, prêt à partir. `null` tant qu'il se dessine. */
  fichier: File | null;
  phone: string | null;
}

/**
 * Prépare le reçu dès l'affichage de la confirmation, sans attendre le clic.
 *
 * Ce n'est pas de l'optimisation prématurée : le partage natif exige d'être
 * appelé dans la foulée du geste de l'utilisatrice. Dessiner l'image après le
 * clic ferait perdre cette autorisation, et Safari refuserait purement et
 * simplement d'ouvrir la feuille de partage.
 */
export function useRecu(groupId: string, transaction: Transaction): Recu {
  const [donnees, setDonnees] = useState<DonneesRecu | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;

    void (async () => {
      const db = getDb();
      const [membre, caisse] = await Promise.all([
        transaction.memberId ? db.members.get(transaction.memberId) : undefined,
        db.groups.get(groupId),
      ]);
      if (!vivant) return;

      const contenu: DonneesRecu = {
        reference: transaction.id.replace(/-/g, '').slice(-6).toUpperCase(),
        type: operationMeta(transaction.type).label,
        montant: formatSigned(transaction.amount, directionOf(transaction.type)),
        membre: membre?.fullName ?? 'Membre',
        caisse: caisse?.name ?? 'Caisse',
        source: SOURCE_LABELS[transaction.source],
        date: formatDateLong(transaction.occurredAt),
        tresoriere: getSession()?.displayName ?? 'Trésorière',
      };
      setDonnees(contenu);
      setPhone(membre?.phone ?? null);

      try {
        const blob = await genererRecuPng(contenu);
        if (!vivant) return;
        setFichier(
          new File([blob], `recu-akwe-${contenu.reference}.png`, { type: 'image/png' }),
        );
      } catch (erreur) {
        // Sans image, le bouton proposera le texte seul plutôt que rien.
        console.error('AKWÈ : reçu non dessiné', erreur);
      }
    })();

    return () => {
      vivant = false;
    };
  }, [groupId, transaction]);

  return { donnees, fichier, phone };
}
