'use client';

import { getSession, rafraichirJeton } from '@/lib/auth/session';
import { supabase } from '@/lib/auth/supabase';

/**
 * Jeton porté par les appels à l'API.
 *
 * `/api/sync` refuse toute requête sans en-tête `Authorization` et répond 401.
 * L'échec est silencieux pour la trésorière : la file d'attente se marque
 * « échouée », le badge « en attente » reste affiché, et rien n'indique que la
 * cause est un en-tête manquant. D'où ce module, minuscule mais nécessaire.
 *
 * Le jeton est demandé à Supabase juste avant chaque envoi, et non lu dans la
 * session enregistrée à la connexion. La bibliothèque sait s'il a expiré et le
 * renouvelle alors d'elle-même ; la copie locale n'a, elle, aucun moyen de le
 * savoir et vaut un 401 par saisie une heure après l'ouverture de session.
 *
 * Sans projet configuré, on envoie le jeton de démonstration, que le serveur
 * n'accepte que si aucune base n'est branchée ou si `DEMO_MODE` est actif : il
 * ne peut donc pas servir à écrire dans une vraie base.
 */

export const JETON_DEMO = 'demo';

export async function jetonDAcces(): Promise<string> {
  const local = getSession()?.accessToken;
  const client = supabase();
  if (!client) return local ?? JETON_DEMO;

  try {
    const { data } = await client.auth.getSession();
    const frais = data.session?.access_token;
    if (!frais) return local ?? JETON_DEMO;
    rafraichirJeton(frais);
    return frais;
  } catch {
    // Hors ligne, `getSession` peut échouer sur le renouvellement. Le jeton
    // enregistré reste la meilleure option : s'il est périmé, l'envoi sera
    // retenté au retour du réseau, cette fois avec un jeton neuf.
    return local ?? JETON_DEMO;
  }
}
