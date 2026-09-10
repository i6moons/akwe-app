import { routes } from '@/lib/routes';

/**
 * Les destinations du menu, partagées par le tiroir des téléphones et la
 * barre latérale des grands écrans : une seule liste à tenir à jour.
 *
 * L'icône est nommée plutôt qu'importée ici : ce fichier reste utilisable
 * depuis un composant serveur.
 */
export const NAV_LINKS = [
  { href: routes.accueil, label: 'Accueil', icon: 'Home' },
  { href: routes.caisses, label: 'Mes caisses', icon: 'Wallet' },
  { href: routes.nouvelleCaisse, label: 'Nouvelle caisse', icon: 'Users' },
  { href: routes.operations, label: 'Historique', icon: 'History' },
] as const;

/**
 * Écrans affichés sans la coquille : ouverture et authentification.
 * Ils occupent tout l'écran et n'ont pas de navigation.
 */
export const ROUTES_SANS_COQUILLE: readonly string[] = [
  routes.splash,
  routes.connexion,
  // Étapes de l'inscription : la navigation y offrirait une porte de sortie
  // vers l'accueil, alors qu'aucun compte n'existe encore.
  routes.inscription,
  routes.motDePasse,
  routes.inscriptionReussie,
  '/offline',
];

/**
 * Parmi celles-ci, celles qui peignent leur propre fond d'un bord à l'autre.
 * La coquille ne leur impose pas de colonne : elles la posent elles-mêmes, sans
 * quoi le fond serait découpé en bande au milieu de l'écran.
 */
export const ROUTES_PLEINE_LARGEUR: readonly string[] = [routes.splash];
