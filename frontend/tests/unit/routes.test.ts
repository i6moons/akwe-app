import { describe, expect, it } from 'vitest';
import { routes, STATIC_PATHS } from '@/lib/routes';

/**
 * Garde-fou du mode hors ligne.
 *
 * Le service worker met en cache exactement les chemins de `STATIC_PATHS`. Si
 * quelqu'un ajoute un écran sans l'y déclarer, cet écran devient inaccessible
 * dès la perte du réseau — et personne ne s'en aperçoit avant la démo.
 */

const ALL = [
  routes.splash,
  routes.connexion,
  routes.verification,
  routes.accueil,
  routes.operations,
  routes.caisses,
  routes.nouvelleCaisse,
  routes.caisse('g1'),
  routes.membres('g1'),
  routes.nouveauMembre('g1'),
  routes.membre('g1', 'm1'),
  routes.modifierMembre('g1', 'm1'),
  routes.historique('g1'),
  routes.saisieVocale('g1'),
  routes.saisieManuelle('g1'),
];

describe('routes', () => {
  it('déclare chaque écran dans la liste mise en cache', () => {
    for (const route of ALL) {
      const pathname = route.split('?')[0];
      expect(STATIC_PATHS, `${pathname} doit figurer dans STATIC_PATHS`).toContain(pathname);
    }
  });

  it("n'utilise aucun segment dynamique : ils ne sont pas pré-rendus", () => {
    for (const path of STATIC_PATHS) {
      expect(path).not.toMatch(/\[|\]/);
    }
  });

  it('transporte les identifiants dans la requête', () => {
    expect(routes.caisse('grp-ayaba')).toBe('/caisses/detail?caisse=grp-ayaba');
    expect(routes.membre('grp-ayaba', 'm1')).toBe('/caisses/membre?caisse=grp-ayaba&membre=m1');
  });

  it('échappe les identifiants inhabituels', () => {
    expect(routes.caisse('a b&c=d')).toBe('/caisses/detail?caisse=a+b%26c%3Dd');
  });
});
