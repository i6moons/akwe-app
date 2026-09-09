import type { Route } from 'next';

/**
 * Toutes les adresses de l'application, à un seul endroit.
 *
 * Choix structurant : l'identifiant de la caisse voyage dans la requête
 * (`?caisse=…`) et non dans le chemin. Next.js ne pré-rend au build que les
 * routes sans segment dynamique ; ce sont les seules que le service worker peut
 * mettre en cache d'avance. Avec `/caisses/[id]`, toute page jamais ouverte
 * devenait inaccessible dès la perte du réseau — inacceptable pour une
 * application dont c'est la promesse.
 */

/** Noms des paramètres, pour éviter les chaînes magiques dans les écrans. */
export const PARAM_CAISSE = 'caisse';
export const PARAM_MEMBRE = 'membre';

function withParams(path: string, params: Record<string, string>): Route {
  const query = new URLSearchParams(params).toString();
  return `${path}?${query}` as Route;
}

export const routes = {
  splash: '/' as Route,
  connexion: '/connexion' as Route,
  verification: '/verification' as Route,
  accueil: '/accueil' as Route,
  operations: '/operations' as Route,
  caisses: '/caisses' as Route,
  nouvelleCaisse: '/caisses/nouvelle' as Route,

  caisse: (id: string) => withParams('/caisses/detail', { [PARAM_CAISSE]: id }),
  membres: (id: string) => withParams('/caisses/membres', { [PARAM_CAISSE]: id }),
  nouveauMembre: (id: string) => withParams('/caisses/membres/nouveau', { [PARAM_CAISSE]: id }),

  membre: (id: string, memberId: string) =>
    withParams('/caisses/membre', { [PARAM_CAISSE]: id, [PARAM_MEMBRE]: memberId }),
  modifierMembre: (id: string, memberId: string) =>
    withParams('/caisses/membre/modifier', { [PARAM_CAISSE]: id, [PARAM_MEMBRE]: memberId }),

  historique: (id: string) => withParams('/caisses/operations', { [PARAM_CAISSE]: id }),
  saisieVocale: (id: string) => withParams('/caisses/operations/vocale', { [PARAM_CAISSE]: id }),
  saisieManuelle: (id: string) =>
    withParams('/caisses/operations/manuelle', { [PARAM_CAISSE]: id }),
} as const;

/**
 * Les chemins pré-rendus au build, sans leur requête.
 * Le service worker les met tous en cache à l'installation : chaque écran de
 * l'application s'ouvre alors sans réseau, dès le premier lancement.
 */
export const STATIC_PATHS = [
  '/',
  '/connexion',
  '/verification',
  '/accueil',
  '/operations',
  '/caisses',
  '/caisses/nouvelle',
  '/caisses/detail',
  '/caisses/membres',
  '/caisses/membres/nouveau',
  '/caisses/membre',
  '/caisses/membre/modifier',
  '/caisses/operations',
  '/caisses/operations/vocale',
  '/caisses/operations/manuelle',
  '/offline',
] as const;
