'use client';

import { openSession } from '@/lib/auth/session';
import { adresseDepuisNumero, supabase } from '@/lib/auth/supabase';
import { preparerCarnet } from '@/lib/db/preparer';

/**
 * Connexion d'une trésorière : son numéro et son code fixe à six chiffres.
 *
 * Aucun compte n'est créé ici, et c'est ce qui distingue cet écran de
 * l'inscription. Un numéro inconnu échoue comme un code erroné, sans dire
 * lequel des deux est en cause : répondre « ce numéro n'existe pas »
 * reviendrait à confirmer, à qui essaie des numéros au hasard, lesquels sont
 * ceux de vraies trésorières.
 */
export type Echec = 'identifiants' | 'reseau';

export async function seConnecter(phone: string, code: string): Promise<Echec | null> {
  const client = supabase();

  // Aucun projet configuré : on ouvre malgré tout la session locale, sinon la
  // démonstration hors ligne deviendrait impossible.
  if (!client) {
    openSession(phone);
    await preparerCarnet();
    return null;
  }

  let data;
  try {
    const reponse = await client.auth.signInWithPassword({
      email: adresseDepuisNumero(phone),
      password: code,
    });
    if (reponse.error || !reponse.data.session) return 'identifiants';
    data = reponse.data;
  } catch {
    return 'reseau';
  }

  const nom = data.user?.user_metadata?.full_name as string | undefined;
  openSession(phone, nom, data.session.access_token);
  // Le carnet est rapatrié avant l'arrivée sur l'accueil : les fournisseurs sont
  // déjà montés et ne relanceraient pas la préparation d'eux-mêmes.
  await preparerCarnet();
  return null;
}
