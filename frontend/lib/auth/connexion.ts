'use client';

import { apiUrl } from '@/lib/api';
import { openSession } from '@/lib/auth/session';
import { adresseDepuisNumero, supabase } from '@/lib/auth/supabase';
import { preparerCarnet } from '@/lib/db/preparer';

/**
 * Connexion d'une trésorière : numéro de téléphone et code à 6 chiffres.
 *
 * Le code est le secret du compte, pas un code à usage unique envoyé par SMS.
 * Un vrai SMS suppose un fournisseur payant ; l'écran reste identique, mais la
 * première saisie fixe le code et les suivantes le vérifient. Supabase compare
 * l'empreinte du code : nous n'en conservons aucune copie.
 */

export type Echec = 'code' | 'reseau';

/**
 * `nouveau` distingue une première connexion d'un retour. L'écran s'en sert pour
 * demander son nom à la trésorière, une seule fois, plutôt que de lui en prêter
 * un d'office.
 */
export type Connexion = { ok: true; nouveau: boolean } | { ok: false; cause: Echec };

export async function seConnecter(phone: string, code: string): Promise<Connexion> {
  let horsLigne = false;
  let nouveau = false;

  try {
    const reponse = await fetch(apiUrl('/api/auth/acces'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    if (!reponse.ok) {
      return { ok: false, cause: reponse.status === 400 ? 'code' : 'reseau' };
    }
    const donnees = (await reponse.json()) as { horsLigne?: boolean; nouveau?: boolean };
    horsLigne = Boolean(donnees.horsLigne);
    nouveau = Boolean(donnees.nouveau);
  } catch {
    return { ok: false, cause: 'reseau' };
  }

  const client = supabase();
  // Aucun projet configuré : on ouvre malgré tout la session locale, sinon la
  // démonstration hors ligne deviendrait impossible.
  if (horsLigne || !client) {
    openSession(phone);
    await preparerCarnet();
    return { ok: true, nouveau: false };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: adresseDepuisNumero(phone),
    password: code,
  });

  if (error || !data.session) return { ok: false, cause: 'code' };

  const nom = data.user?.user_metadata?.full_name as string | undefined;
  openSession(phone, nom, data.session.access_token);
  // Le carnet est rapatrié avant l'arrivée sur l'accueil : les fournisseurs sont
  // déjà montés et ne relanceraient pas la préparation d'eux-mêmes.
  await preparerCarnet();
  return { ok: true, nouveau };
}
