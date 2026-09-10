'use client';

import { getSession } from '@/lib/auth/session';
import { seedDemoData } from '@/lib/db/seed';
import { hydrater } from '@/lib/sync/hydrate';

/**
 * Prépare le carnet local : ce que le serveur détient d'abord, un jeu de
 * démonstration ensuite s'il n'y a vraiment rien.
 *
 * L'ordre est ce qui compte. Interroger le serveur en premier fait réapparaître
 * les caisses après un changement de téléphone ou un navigateur vidé ; amorcer
 * avant aurait ajouté un jeu d'exemple par-dessus les vraies caisses, et la
 * trésorière aurait vu son carnet en double.
 *
 * Rien n'est préparé tant que personne n'est connectée : les données créées
 * n'appartiendraient alors à aucun compte.
 */
export async function preparerCarnet(): Promise<void> {
  if (!getSession()) return;
  await hydrater();
  await seedDemoData();
}
