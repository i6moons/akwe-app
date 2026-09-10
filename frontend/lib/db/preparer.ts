'use client';

import { DEMO_MODE } from '@/lib/api';
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
 */
export async function preparerCarnet(): Promise<void> {
  // En démonstration il n'y a ni compte ni base : le jeu d'exemple est tout ce
  // que l'application a à montrer. Exiger une session y viderait les écrans, y
  // compris ceux que les tests de bout en bout ouvrent sans passer par la
  // connexion.
  if (DEMO_MODE) {
    await seedDemoData();
    return;
  }

  // Hors démonstration, rien n'est préparé tant que personne n'est connectée :
  // les données créées n'appartiendraient alors à aucun compte.
  if (!getSession()) return;

  // Aucun jeu d'exemple ici, et c'est délibéré : un compte neuf ouvre sur un
  // carnet vide, que la trésorière remplit avec ses propres caisses. Semer des
  // tontines inventées donnerait une application déjà pleine de données
  // n'appartenant à personne, et noierait ce qu'elle vient d'enregistrer.
  await hydrater();
}
