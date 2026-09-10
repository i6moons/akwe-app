'use client';

import { getSession } from '@/lib/auth/session';

/**
 * Jeton porté par les appels à l'API.
 *
 * `/api/sync` refuse toute requête sans en-tête `Authorization` et répond 401.
 * L'échec est silencieux pour la trésorière : la file d'attente se marque
 * « échouée », le badge « en attente » reste affiché, et rien n'indique que la
 * cause est un en-tête manquant. D'où ce module, minuscule mais nécessaire.
 *
 * L'authentification réelle n'étant pas encore branchée, la session ne contient
 * pas de jeton signé. On envoie alors le jeton de démonstration, que le serveur
 * n'accepte que si aucun projet Supabase n'est configuré ou si `DEMO_MODE` est
 * actif : il ne peut donc pas servir à écrire dans une vraie base.
 */

export const JETON_DEMO = 'demo';

export function jetonDAcces(): string {
  return getSession()?.accessToken ?? JETON_DEMO;
}
