'use client';

import { apiUrl, fetchAvecDelai } from '@/lib/api';

/**
 * Création du compte : nom, numéro, et code fixe à six chiffres.
 *
 * L'inscription ne connecte pas. La trésorière voit un écran de confirmation
 * puis saisit son code une seconde fois pour entrer : c'est la seule façon de
 * s'assurer qu'elle l'a bien retenu, un code perdu ne se récupérant pas.
 */
export type EchecInscription = 'deja-inscrit' | 'refus' | 'reseau';

export async function sInscrire(
  phone: string,
  fullName: string,
  code: string,
): Promise<EchecInscription | null> {
  try {
    // L'échéance retombe dans le `catch` ci-dessous, donc sur « reseau » : la
    // trésorière voit un message et peut réessayer, au lieu d'un bouton figé.
    const reponse = await fetchAvecDelai(apiUrl('/api/auth/inscription'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, fullName, code }),
    });
    if (reponse.ok) return null;
    return reponse.status === 409 ? 'deja-inscrit' : 'refus';
  } catch {
    return 'reseau';
  }
}
